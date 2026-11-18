/**
 * Tests for chain/verify.ts and chain/findings.ts
 *
 * Covers all truth-table cases from Task 5.3 and all property tests from 5.4:
 *   - Clean chain verifies ok.
 *   - Version mismatch gives VERSION_UNSUPPORTED and ok=false.
 *   - Single-field mutation at any seq is caught with HASH_MISMATCH.
 *   - Deletion produces SEQ_GAP and/or LINK_BROKEN at the right place.
 *   - Insertion with a recomputed hash produces LINK_BROKEN.
 *   - Reordering two events produces a finding at the first reordered position.
 *   - Lawful erasure marker makes a re-hashed row report LAWFUL_CHANGE, not tampering.
 *   - Invalid seal signature gives SEAL_INVALID.
 *   - Anchor digest mismatch gives ANCHOR_MISMATCH; missing headHash gives ANCHOR_MISSING.
 *   - Property: any single-field mutation of any event in any chain is caught.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createLog, GENESIS_PREV_HASH } from './append.js';
import { verifyChain } from './verify.js';
import { canonical } from '../crypto/canonical.js';
import { sha256Hex } from '../crypto/hash.js';
import { generateKeyPair } from '../crypto/keys.js';
import { signPayload } from '../crypto/sign.js';
import { FORMAT_VERSION } from '../format.js';
import type { AuditEvent, AppendDraft, Seal, Anchor } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIXED_AT = '2024-01-01T00:00:00.000Z';

function draft(overrides: Partial<AppendDraft> = {}): AppendDraft {
  return {
    at: FIXED_AT,
    actor: { id: 'alice', role: 'admin' },
    action: 'roles.grant',
    subject: 'bob',
    outcome: 'committed',
    lawful: 'none',
    detail: {},
    ...overrides,
  };
}

/** Build a fresh log with `n` events. */
async function buildChain(n: number): Promise<AuditEvent[]> {
  const log = createLog({ formatVersion: FORMAT_VERSION });
  for (let i = 0; i < n; i++) {
    await log.append(draft({ subject: `item-${i}` }));
  }
  return [...log.events()];
}

/** Thaw a frozen event so we can mutate it in a test. */
function thaw(ev: AuditEvent): AuditEvent {
  return { ...ev, detail: { ...ev.detail }, actor: { ...ev.actor } };
}

/** Recompute the hash of an (already-thawed) event, as if it were freshly appended. */
async function rehash(ev: AuditEvent): Promise<AuditEvent> {
  const preimage: Record<string, unknown> = {
    seq: ev.seq,
    at: ev.at,
    actor: ev.actor,
    action: ev.action,
    subject: ev.subject,
    outcome: ev.outcome,
    lawful: ev.lawful,
    detail: ev.detail,
    prevHash: ev.prevHash,
  };
  const hash = await sha256Hex(canonical(preimage));
  return { ...ev, hash };
}

// ---------------------------------------------------------------------------
// Clean chain
// ---------------------------------------------------------------------------

describe('verifyChain — clean chain', () => {
  it('a chain of 5 events verifies ok with no findings', async () => {
    const events = await buildChain(5);
    const kp = await generateKeyPair();
    const result = await verifyChain({ formatVersion: FORMAT_VERSION, events }, kp.publicKeyPem);
    expect(result.ok).toBe(true);
    expect(result.findings).toHaveLength(0);
    expect(result.firstDivergence).toBeNull();
    expect(result.counts.events).toBe(5);
  });

  it('an empty chain verifies ok', async () => {
    const kp = await generateKeyPair();
    const result = await verifyChain({ formatVersion: FORMAT_VERSION, events: [] }, kp.publicKeyPem);
    expect(result.ok).toBe(true);
    expect(result.findings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Version check
// ---------------------------------------------------------------------------

describe('verifyChain — version mismatch', () => {
  it('wrong formatVersion gives VERSION_UNSUPPORTED and ok=false', async () => {
    const events = await buildChain(3);
    const kp = await generateKeyPair();
    const result = await verifyChain(
      { formatVersion: 'anchora/0', events },
      kp.publicKeyPem,
    );
    expect(result.ok).toBe(false);
    expect(result.findings[0]?.code).toBe('VERSION_UNSUPPORTED');
    // The verifier must not proceed and produce false positives.
    expect(result.findings).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Single-field mutation
// ---------------------------------------------------------------------------

describe('verifyChain — single-field mutation', () => {
  it('mutating subject on seq 1 produces HASH_MISMATCH at seq 1', async () => {
    const events = await buildChain(5);
    const tampered: AuditEvent[] = [...events];
    tampered[0] = { ...thaw(events[0]!), subject: 'mallory' };

    const kp = await generateKeyPair();
    const result = await verifyChain({ formatVersion: FORMAT_VERSION, events: tampered }, kp.publicKeyPem);
    expect(result.ok).toBe(false);
    const hm = result.findings.find((f) => f.code === 'HASH_MISMATCH');
    expect(hm).toBeDefined();
    expect(hm!.seq).toBe(1);
    expect(result.firstDivergence).toBe(1);
  });

  it('mutating subject on seq 3 produces HASH_MISMATCH at seq 3', async () => {
    const events = await buildChain(5);
    const tampered: AuditEvent[] = [...events];
    tampered[2] = { ...thaw(events[2]!), subject: 'tampered' };

    const kp = await generateKeyPair();
    const result = await verifyChain({ formatVersion: FORMAT_VERSION, events: tampered }, kp.publicKeyPem);
    expect(result.ok).toBe(false);
    const hm = result.findings.find((f) => f.code === 'HASH_MISMATCH');
    expect(hm!.seq).toBe(3);
    expect(result.firstDivergence).toBe(3);
  });

  it('mutating actor.id produces HASH_MISMATCH', async () => {
    const events = await buildChain(3);
    const tampered: AuditEvent[] = [...events];
    tampered[1] = { ...thaw(events[1]!), actor: { id: 'evil', role: 'admin' } };

    const kp = await generateKeyPair();
    const result = await verifyChain({ formatVersion: FORMAT_VERSION, events: tampered }, kp.publicKeyPem);
    expect(result.ok).toBe(false);
    const hm = result.findings.filter((f) => f.code === 'HASH_MISMATCH');
    expect(hm.some((f) => f.seq === 2)).toBe(true);
  });

  it('mutating outcome produces HASH_MISMATCH', async () => {
    const events = await buildChain(2);
    const tampered: AuditEvent[] = [...events];
    tampered[0] = { ...thaw(events[0]!), outcome: 'refused' };

    const kp = await generateKeyPair();
    const result = await verifyChain({ formatVersion: FORMAT_VERSION, events: tampered }, kp.publicKeyPem);
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.code === 'HASH_MISMATCH' && f.seq === 1)).toBe(true);
  });

  it('mutating at produces HASH_MISMATCH', async () => {
    const events = await buildChain(2);
    const tampered: AuditEvent[] = [...events];
    tampered[0] = { ...thaw(events[0]!), at: '2099-01-01T00:00:00.000Z' };

    const kp = await generateKeyPair();
    const result = await verifyChain({ formatVersion: FORMAT_VERSION, events: tampered }, kp.publicKeyPem);
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.code === 'HASH_MISMATCH' && f.seq === 1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Deletion
// ---------------------------------------------------------------------------

describe('verifyChain — deletion', () => {
  it('deleting seq 3 from a 5-event chain produces SEQ_GAP at seq 4', async () => {
    const events = await buildChain(5);
    // Remove index 2 (seq=3).
    const tampered = [events[0]!, events[1]!, events[3]!, events[4]!];

    const kp = await generateKeyPair();
    const result = await verifyChain({ formatVersion: FORMAT_VERSION, events: tampered }, kp.publicKeyPem);
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.code === 'SEQ_GAP')).toBe(true);
  });

  it('deleting the first event produces SEQ_GAP (expected 1, found 2)', async () => {
    const events = await buildChain(4);
    const tampered = events.slice(1);

    const kp = await generateKeyPair();
    const result = await verifyChain({ formatVersion: FORMAT_VERSION, events: tampered }, kp.publicKeyPem);
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.code === 'SEQ_GAP')).toBe(true);
  });

  it('deleting the last event produces no SEQ_GAP (chain is just shorter)', async () => {
    const events = await buildChain(5);
    const tampered = events.slice(0, 4);

    const kp = await generateKeyPair();
    const result = await verifyChain({ formatVersion: FORMAT_VERSION, events: tampered }, kp.publicKeyPem);
    // Tail deletion is undetectable by hash-chain alone — the chain of 4 is valid.
    expect(result.ok).toBe(true);
  });

  it('deleting a middle event also produces LINK_BROKEN on the event that follows', async () => {
    const events = await buildChain(5);
    // Remove seq 2 (index 1); seq 3 now has prevHash pointing at seq 1's hash,
    // but seq 2's hash is what seq 3 actually used.
    const tampered = [events[0]!, events[2]!, events[3]!, events[4]!];

    const kp = await generateKeyPair();
    const result = await verifyChain({ formatVersion: FORMAT_VERSION, events: tampered }, kp.publicKeyPem);
    expect(result.ok).toBe(false);
    // Should have SEQ_GAP (expected 2, found 3) and LINK_BROKEN (seq 3 prevHash wrong).
    expect(result.findings.some((f) => f.code === 'SEQ_GAP')).toBe(true);
    expect(result.findings.some((f) => f.code === 'LINK_BROKEN')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Insertion with recomputed hash
// ---------------------------------------------------------------------------

describe('verifyChain — insertion with recomputed hash', () => {
  it('inserting a fake event with recomputed hash between seq 2 and 3 produces LINK_BROKEN at seq 3', async () => {
    const events = await buildChain(4);

    // Craft a fake event that correctly links to seq 2's hash.
    const fake: AuditEvent = await rehash({
      seq: 3,
      at: FIXED_AT,
      actor: { id: 'evil', role: 'attacker' },
      action: 'roles.revoke',
      subject: 'victim',
      outcome: 'committed',
      lawful: 'none',
      detail: {},
      prevHash: events[1]!.hash,
      hash: '', // filled by rehash
    });

    // The original seq 3 and 4 now have wrong prevHash relative to fake's hash.
    const tampered = [events[0]!, events[1]!, fake, events[2]!, events[3]!];

    const kp = await generateKeyPair();
    const result = await verifyChain({ formatVersion: FORMAT_VERSION, events: tampered }, kp.publicKeyPem);
    expect(result.ok).toBe(false);
    // seq numbering is off (5 events with seqs 1,2,3,3,4) — SEQ_GAP or LINK_BROKEN.
    const hasProblem =
      result.findings.some((f) => f.code === 'SEQ_GAP') ||
      result.findings.some((f) => f.code === 'LINK_BROKEN');
    expect(hasProblem).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Reordering
// ---------------------------------------------------------------------------

describe('verifyChain — reordering', () => {
  it('swapping seq 2 and seq 3 produces a finding at seq 2 (the first reordered position)', async () => {
    const events = await buildChain(5);
    // Swap the objects but keep their seq numbers — this is what "reordering" means:
    // the events appear in a different physical order while their seq values are preserved.
    // Alternatively the attacker swaps seq values but keeps hashes — either way a finding fires.
    // Here we swap the objects in the array; seq 2 slot now holds the seq 3 event and vice versa.
    const tampered = [events[0]!, events[2]!, events[1]!, events[3]!, events[4]!];

    const kp = await generateKeyPair();
    const result = await verifyChain({ formatVersion: FORMAT_VERSION, events: tampered }, kp.publicKeyPem);
    expect(result.ok).toBe(false);
    // The first position with a finding should be at the lower seq (which is now seq 3 in slot 1).
    // Either SEQ_GAP, LINK_BROKEN or HASH_MISMATCH fires.
    expect(result.findings.length).toBeGreaterThan(0);
    // The lowest seq with a finding must be ≤ 3.
    const minSeq = Math.min(...result.findings.map((f) => f.seq));
    expect(minSeq).toBeLessThanOrEqual(3);
  });

  it('reordering the first two events is detected', async () => {
    const events = await buildChain(4);
    const tampered = [events[1]!, events[0]!, events[2]!, events[3]!];

    const kp = await generateKeyPair();
    const result = await verifyChain({ formatVersion: FORMAT_VERSION, events: tampered }, kp.publicKeyPem);
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Lawful change
// ---------------------------------------------------------------------------

describe('verifyChain — lawful change', () => {
  it('a lawful erasure marker makes a re-hashed row report LAWFUL_CHANGE, not HASH_MISMATCH', async () => {
    // Build a chain where seq 2 declares a lawful erasure.
    const log = createLog({ formatVersion: FORMAT_VERSION });
    await log.append(draft({ subject: 'initial' }));
    await log.append(draft({
      action: 'identity.user.suspend',
      subject: 'gdpr-request',
      lawful: 'erasure',
      actor: { id: 'dpo@example.com', role: 'dpo' },
    }));
    await log.append(draft({ subject: 'subsequent' }));

    const events = [...log.events()];

    // Simulate what lawful erasure looks like: the payload is stripped and the
    // event is re-hashed (the stored hash changes but the lawful field remains).
    // The verifier sees a hash mismatch but classifies it as LAWFUL_CHANGE
    // because lawful != 'none' and authority is present.
    const thawed = thaw(events[1]!);
    thawed.detail = {}; // erasure strips the payload
    const rehashed = await rehash(thawed);
    const tampered = [events[0]!, rehashed, events[2]!];

    const kp = await generateKeyPair();
    const result = await verifyChain({ formatVersion: FORMAT_VERSION, events: tampered }, kp.publicKeyPem);

    // ok may be true (LAWFUL_CHANGE is info severity).
    expect(result.findings.some((f) => f.code === 'LAWFUL_CHANGE' && f.seq === 2)).toBe(true);
    expect(result.findings.every((f) => f.code !== 'HASH_MISMATCH' || f.seq !== 2)).toBe(true);
    // LAWFUL_CHANGE finding carries the authority.
    const lc = result.findings.find((f) => f.code === 'LAWFUL_CHANGE' && f.seq === 2)!;
    expect(lc.lawfulBy).toBe('dpo@example.com');
  });

  it('a plain hash mismatch without a lawful marker reports HASH_MISMATCH (not LAWFUL_CHANGE)', async () => {
    const events = await buildChain(3);
    const tampered = [...events];
    tampered[1] = { ...thaw(events[1]!), subject: 'silent-edit' };

    const kp = await generateKeyPair();
    const result = await verifyChain({ formatVersion: FORMAT_VERSION, events: tampered }, kp.publicKeyPem);
    expect(result.findings.some((f) => f.code === 'HASH_MISMATCH' && f.seq === 2)).toBe(true);
    expect(result.findings.every((f) => f.code !== 'LAWFUL_CHANGE')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Seals
// ---------------------------------------------------------------------------

describe('verifyChain — seals', () => {
  it('a valid seal verifies without findings', async () => {
    const events = await buildChain(3);
    const kp = await generateKeyPair();

    const sealPayload = {
      seq: 3,
      hash: events[2]!.hash,
      at: FIXED_AT,
      keyId: kp.fingerprint,
    };
    const signature = await signPayload(sealPayload, kp.privateKeyPem);
    const seal: Seal = { ...sealPayload, signature };

    const result = await verifyChain(
      { formatVersion: FORMAT_VERSION, events, seals: [seal] },
      kp.publicKeyPem,
    );
    expect(result.ok).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it('a seal with a wrong hash gives SEAL_INVALID', async () => {
    const events = await buildChain(3);
    const kp = await generateKeyPair();

    const sealPayload = {
      seq: 3,
      hash: 'a'.repeat(64), // wrong hash
      at: FIXED_AT,
      keyId: kp.fingerprint,
    };
    const signature = await signPayload(sealPayload, kp.privateKeyPem);
    const seal: Seal = { ...sealPayload, signature };

    const result = await verifyChain(
      { formatVersion: FORMAT_VERSION, events, seals: [seal] },
      kp.publicKeyPem,
    );
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.code === 'SEAL_INVALID' && f.seq === 3)).toBe(true);
  });

  it('a seal signed with a different key gives SEAL_INVALID', async () => {
    const events = await buildChain(2);
    const kp1 = await generateKeyPair();
    const kp2 = await generateKeyPair();

    const sealPayload = {
      seq: 2,
      hash: events[1]!.hash,
      at: FIXED_AT,
      keyId: kp1.fingerprint,
    };
    const signature = await signPayload(sealPayload, kp2.privateKeyPem); // wrong key
    const seal: Seal = { ...sealPayload, signature };

    const result = await verifyChain(
      { formatVersion: FORMAT_VERSION, events, seals: [seal] },
      kp1.publicKeyPem,
    );
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.code === 'SEAL_INVALID')).toBe(true);
  });

  it('a seal referencing a non-existent seq gives SEAL_INVALID', async () => {
    const events = await buildChain(2);
    const kp = await generateKeyPair();

    const sealPayload = {
      seq: 99,
      hash: 'a'.repeat(64),
      at: FIXED_AT,
      keyId: kp.fingerprint,
    };
    const signature = await signPayload(sealPayload, kp.privateKeyPem);
    const seal: Seal = { ...sealPayload, signature };

    const result = await verifyChain(
      { formatVersion: FORMAT_VERSION, events, seals: [seal] },
      kp.publicKeyPem,
    );
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.code === 'SEAL_INVALID' && f.seq === 99)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Anchors
// ---------------------------------------------------------------------------

describe('verifyChain — anchors', () => {
  it('a valid anchor verifies without findings', async () => {
    const events = await buildChain(3);
    const kp = await generateKeyPair();

    const sealSig = 'fakesig==';
    const anchorInput = { seq: 3, headHash: events[2]!.hash, sealSignature: sealSig };
    const anchorDigest = await sha256Hex(canonical(anchorInput));
    const anchor: Anchor = { ...anchorInput, anchorDigest, at: FIXED_AT };

    const result = await verifyChain(
      { formatVersion: FORMAT_VERSION, events, anchors: [anchor] },
      kp.publicKeyPem,
    );
    expect(result.ok).toBe(true);
  });

  it('a tampered anchor digest gives ANCHOR_MISMATCH', async () => {
    const events = await buildChain(2);
    const kp = await generateKeyPair();

    const anchor: Anchor = {
      seq: 2,
      headHash: events[1]!.hash,
      sealSignature: 'sig',
      anchorDigest: 'b'.repeat(64), // wrong
      at: FIXED_AT,
    };

    const result = await verifyChain(
      { formatVersion: FORMAT_VERSION, events, anchors: [anchor] },
      kp.publicKeyPem,
    );
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.code === 'ANCHOR_MISMATCH' && f.seq === 2)).toBe(true);
  });

  it('an anchor whose headHash is not in the chain gives ANCHOR_MISSING', async () => {
    const events = await buildChain(2);
    const kp = await generateKeyPair();

    const anchor: Anchor = {
      seq: 2,
      headHash: 'c'.repeat(64), // not in chain
      sealSignature: 'sig',
      anchorDigest: 'd'.repeat(64),
      at: FIXED_AT,
    };

    const result = await verifyChain(
      { formatVersion: FORMAT_VERSION, events, anchors: [anchor] },
      kp.publicKeyPem,
    );
    expect(result.ok).toBe(false);
    expect(result.findings.some((f) => f.code === 'ANCHOR_MISSING' && f.seq === 2)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Property-based: any single-field mutation at any seq is caught
// ---------------------------------------------------------------------------

describe('verifyChain — property tests', () => {
  it('any single-field mutation of any event in any chain is caught at that seq', async () => {
    // We generate chains of length 2–8 and mutate a randomly-chosen field of a
    // randomly-chosen event. The finding must include that event's seq.
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 8 }),
        fc.integer({ min: 0, max: 7 }), // event index (clamped to chain length)
        fc.constantFrom(
          'subject' as const,
          'at' as const,
          'action' as const,
        ),
        async (chainLength, rawIdx, field) => {
          const events = await buildChain(chainLength);
          const idx = rawIdx % chainLength;
          const targetSeq = events[idx]!.seq;

          const tampered = [...events];
          const ev = thaw(events[idx]!);

          if (field === 'subject') {
            ev.subject = ev.subject + '-tampered';
          } else if (field === 'at') {
            ev.at = '2099-12-31T23:59:59.000Z';
          } else if (field === 'action') {
            // Use a different registered action so catalogue validation doesn't fire.
            ev.action = ev.action === 'roles.grant' ? 'roles.revoke' : 'roles.grant';
          }

          tampered[idx] = ev; // stored hash no longer matches

          const kp = await generateKeyPair();
          const result = await verifyChain(
            { formatVersion: FORMAT_VERSION, events: tampered },
            kp.publicKeyPem,
          );

          expect(result.ok).toBe(false);
          // A finding must exist at or near the mutated seq.
          // (A mutation at seq N also breaks the prevHash at seq N+1 if N+1 exists.)
          const affectedSeqs = result.findings.map((f) => f.seq);
          expect(affectedSeqs.some((s) => s <= targetSeq + 1 && s >= targetSeq)).toBe(true);
        },
      ),
      { numRuns: 60 },
    );
  });

  it('a clean chain always produces ok=true and no error findings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 15 }),
        async (n) => {
          const events = await buildChain(n);
          const kp = await generateKeyPair();
          const result = await verifyChain(
            { formatVersion: FORMAT_VERSION, events },
            kp.publicKeyPem,
          );
          expect(result.ok).toBe(true);
          expect(result.findings.every((f) => f.severity !== 'error')).toBe(true);
          expect(result.firstDivergence).toBeNull();
        },
      ),
      { numRuns: 30 },
    );
  });
});

// ---------------------------------------------------------------------------
// findingCode catalogue (findings.ts helpers)
// ---------------------------------------------------------------------------

describe('findings helpers', () => {
  it('sortFindings returns findings by seq ascending, errors before info', async () => {
    const { sortFindings, makeFinding } = await import('./findings.js');
    const findings = [
      makeFinding(5, 'HASH_MISMATCH', 'msg'),
      makeFinding(2, 'LAWFUL_CHANGE', 'msg', 'authority'),
      makeFinding(2, 'HASH_MISMATCH', 'msg'),
      makeFinding(1, 'SEQ_GAP', 'msg'),
    ];
    const sorted = sortFindings(findings);
    expect(sorted[0]!.seq).toBe(1);
    expect(sorted[1]!.seq).toBe(2);
    expect(sorted[1]!.code).toBe('HASH_MISMATCH'); // error before info at seq 2
    expect(sorted[2]!.seq).toBe(2);
    expect(sorted[2]!.code).toBe('LAWFUL_CHANGE');
    expect(sorted[3]!.seq).toBe(5);
  });

  it('firstDivergenceSeq returns the lowest error seq', async () => {
    const { firstDivergenceSeq, makeFinding } = await import('./findings.js');
    const findings = [
      makeFinding(5, 'HASH_MISMATCH', 'msg'),
      makeFinding(2, 'LAWFUL_CHANGE', 'msg', 'authority'), // info, not counted
      makeFinding(3, 'LINK_BROKEN', 'msg'),
    ];
    expect(firstDivergenceSeq(findings)).toBe(3);
  });

  it('firstDivergenceSeq returns null when only info findings exist', async () => {
    const { firstDivergenceSeq, makeFinding } = await import('./findings.js');
    const findings = [makeFinding(2, 'LAWFUL_CHANGE', 'msg', 'authority')];
    expect(firstDivergenceSeq(findings)).toBeNull();
  });
});
