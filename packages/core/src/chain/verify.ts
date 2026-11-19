/**
 * Chain verifier.
 *
 * verifyChain() walks the event list once, checking each of the seven steps
 * from design.md in order:
 *
 *   1. FORMAT_VERSION must match.
 *   2. For each event: recompute hash; compare with stored hash.
 *   3. prevHash must equal the previous event's hash.
 *   4. seq must be contiguous from 1.
 *   5. Each seal: seq must exist, its hash must match, signature must verify.
 *   6. Each anchor: recompute anchorDigest, compare; headHash must exist.
 *   7. Classify divergence: lawful marker → LAWFUL_CHANGE; otherwise tampering.
 *
 * The verifier never trusts its input: every field is parsed defensively and
 * every count is recomputed from scratch.
 */

import { canonical } from '../crypto/canonical.js';
import { sha256Hex } from '../crypto/hash.js';
import { verifyPayload } from '../crypto/sign.js';
import { FORMAT_VERSION } from '../format.js';
import type { AuditEvent, Seal, Anchor, VerificationResult } from './types.js';
import {
  makeVersionUnsupported,
  makeHashMismatch,
  makeLinkBroken,
  makeSeqGap,
  makeSealInvalid,
  makeAnchorMismatch,
  makeAnchorMissing,
  makeLawfulChange,
  sortFindings,
  firstDivergenceSeq,
} from './findings.js';
import { GENESIS_PREV_HASH } from './append.js';
import { eventPreimage } from './preimage.js';
import type { Finding } from './types.js';

// ---------------------------------------------------------------------------
// Bundle shape (input to verifyChain)
// ---------------------------------------------------------------------------

export interface VerifyBundle {
  formatVersion: string;
  events: readonly AuditEvent[];
  seals?: readonly Seal[];
  anchors?: readonly Anchor[];
}

// ---------------------------------------------------------------------------
// Hash recomputation (mirrors append.ts — must stay in sync)
// ---------------------------------------------------------------------------

async function recomputeHash(event: AuditEvent): Promise<string> {
  return sha256Hex(eventPreimage(event));
}

// ---------------------------------------------------------------------------
// verifyChain
// ---------------------------------------------------------------------------

export async function verifyChain(
  bundle: VerifyBundle,
  publicKeyPem: string,
  expectedFingerprint?: string,
): Promise<VerificationResult> {
  const findings: Finding[] = [];
  const seals = bundle.seals ?? [];
  const anchors = bundle.anchors ?? [];

  // ── Step 1: FORMAT_VERSION ───────────────────────────────────────────────

  if (bundle.formatVersion !== FORMAT_VERSION) {
    findings.push(makeVersionUnsupported(bundle.formatVersion, FORMAT_VERSION));
    // Cannot safely continue — seq indexing and hash computation may differ.
    return {
      ok: false,
      formatVersion: bundle.formatVersion,
      counts: {
        events: bundle.events.length,
        seals: seals.length,
        anchors: anchors.length,
      },
      firstDivergence: null,
      findings: sortFindings(findings),
    };
  }

  // ── Build lookup structures ───────────────────────────────────────────────

  // Map seq → event for O(1) seal and anchor lookups.
  const bySeq = new Map<number, AuditEvent>();
  for (const ev of bundle.events) {
    bySeq.set(ev.seq, ev);
  }

  // Set of seq values whose hash does not match, keyed before lawful
  // classification so we can decide the code in step 7.
  const hashMismatchSeqs = new Set<number>();
  // Set of seq values with broken prevHash links.
  const linkBrokenSeqs = new Set<number>();

  // ── Steps 2–4: event-by-event hash, link and seq checks ─────────────────

  let expectedSeq = 1;
  let prevEventHash: string = GENESIS_PREV_HASH;

  for (let i = 0; i < bundle.events.length; i++) {
    const ev = bundle.events[i]!;

    // Step 4: contiguous seq
    if (ev.seq !== expectedSeq) {
      findings.push(makeSeqGap(expectedSeq, ev.seq));
      // Advance expected by the actual gap so subsequent events are checked
      // against the correct next seq.
      expectedSeq = ev.seq + 1;
    } else {
      expectedSeq += 1;
    }

    // Step 3: prevHash link
    if (ev.prevHash !== prevEventHash) {
      linkBrokenSeqs.add(ev.seq);
    }

    // Step 2: recompute hash
    const recomputed = await recomputeHash(ev);
    if (ev.hash !== recomputed) {
      hashMismatchSeqs.add(ev.seq);
    }

    // The prevHash for the next iteration is always the stored hash of this
    // event. If this hash is wrong the next link check will also fire, which
    // is correct — the chain is broken from this point.
    prevEventHash = ev.hash;
  }

  // ── Step 7: classify hash mismatches as lawful or tampering ─────────────

  // Build a map of seq → lawful marker for seqs where lawful != 'none'.
  // A lawful marker event is one that itself records the modification with
  // a non-'none' lawful field and a non-empty actor.id (the authority).
  const lawfulMarkers = new Map<number, { kind: string; authority: string }>();
  for (const ev of bundle.events) {
    if (ev.lawful !== 'none' && ev.actor.id.length > 0) {
      lawfulMarkers.set(ev.seq, { kind: ev.lawful, authority: ev.actor.id });
    }
  }

  const lawfulReported = new Set<number>();

  for (const seq of hashMismatchSeqs) {
    const marker = lawfulMarkers.get(seq);
    if (marker !== undefined) {
      findings.push(makeLawfulChange(seq, marker.kind, marker.authority));
      lawfulReported.add(seq);
    } else {
      const ev = bySeq.get(seq);
      const stored = ev?.hash ?? '?';
      findings.push(makeHashMismatch(seq, stored, '(recomputed)'));
    }
  }

  // An in-row lawful change (erasure that strips the payload and re-hashes in
  // place) leaves a matching hash, so the mismatch loop above never sees it.
  // Report every declared lawful change regardless, so the ledger is complete.
  for (const [seq, marker] of lawfulMarkers) {
    if (!lawfulReported.has(seq)) {
      findings.push(makeLawfulChange(seq, marker.kind, marker.authority));
    }
  }

  for (const seq of linkBrokenSeqs) {
    const ev = bySeq.get(seq);
    if (ev) {
      // Find the previous event's actual hash for the message.
      const prevEv = bySeq.get(seq - 1);
      const actualPrev = prevEv?.hash ?? GENESIS_PREV_HASH;
      findings.push(makeLinkBroken(seq, ev.prevHash, actualPrev));
    }
  }

  // ── Step 5: seals ────────────────────────────────────────────────────────

  for (const seal of seals) {
    const ev = bySeq.get(seal.seq);

    if (ev === undefined) {
      findings.push(makeSealInvalid(seal.seq, `no event at seq ${seal.seq}`));
      continue;
    }

    if (seal.hash !== ev.hash) {
      findings.push(
        makeSealInvalid(
          seal.seq,
          `seal hash ${seal.hash.slice(0, 8)}… does not match event hash ${ev.hash.slice(0, 8)}…`,
        ),
      );
      continue;
    }

    // Verify Ed25519 signature over canonical({seq, hash, at, keyId}).
    const sealPayload = { seq: seal.seq, hash: seal.hash, at: seal.at, keyId: seal.keyId };
    const valid = await verifyPayload(sealPayload, seal.signature, publicKeyPem);
    if (!valid) {
      findings.push(makeSealInvalid(seal.seq, 'signature verification failed'));
    }

    // If a specific fingerprint was expected, check keyId matches.
    if (expectedFingerprint !== undefined && seal.keyId !== expectedFingerprint) {
      findings.push(
        makeSealInvalid(
          seal.seq,
          `keyId ${seal.keyId} does not match expected fingerprint ${expectedFingerprint}`,
        ),
      );
    }
  }

  // ── Step 6: anchors ──────────────────────────────────────────────────────

  for (const anchor of anchors) {
    // Verify headHash exists in the chain.
    const ev = bySeq.get(anchor.seq);
    if (ev === undefined || ev.hash !== anchor.headHash) {
      findings.push(makeAnchorMissing(anchor.seq));
      continue;
    }

    // Recompute anchorDigest and compare.
    const digestInput = { seq: anchor.seq, headHash: anchor.headHash, sealSignature: anchor.sealSignature };
    const recomputedDigest = await sha256Hex(canonical(digestInput));
    if (anchor.anchorDigest !== recomputedDigest) {
      findings.push(makeAnchorMismatch(anchor.seq, anchor.anchorDigest, recomputedDigest));
    }
  }

  // ── Assemble result ──────────────────────────────────────────────────────

  const sorted = sortFindings(findings);
  const firstDivergence = firstDivergenceSeq(sorted);
  const ok = sorted.every((f) => f.severity !== 'error');

  return {
    ok,
    formatVersion: bundle.formatVersion,
    counts: {
      events: bundle.events.length,
      seals: seals.length,
      anchors: anchors.length,
    },
    firstDivergence,
    findings: sorted,
  };
}
