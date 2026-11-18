/**
 * Chain types for the Anchora evidence core.
 *
 * AuditEvent is the canonical record shape. Every other type here is either
 * derived from it (AppendDraft) or describes chain-level structure (Seal,
 * Anchor, Finding, VerificationResult).
 *
 * Finding codes are stable strings — the CLI, the UI and every test assert on
 * them. Never rename a code; add a new one instead.
 */

// ---------------------------------------------------------------------------
// Core record
// ---------------------------------------------------------------------------

export interface AuditEvent {
  /** 1-based position in the chain, assigned by append(). */
  seq: number;
  /** ISO-8601 timestamp, injected by the caller — never Date.now() inside core. */
  at: string;
  actor: { id: string; role: string };
  /** Must exist in the action catalogue. */
  action: string;
  /** The resource or entity the action targets. */
  subject: string;
  outcome: 'committed' | 'refused' | 'queued';
  /**
   * Marks a lawful change that modifies or removes payload content.
   * 'none'           — no lawful modification; this is a normal event.
   * 'erasure'        — payload content erased under a right-to-erasure request.
   * 'retention'      — payload content replaced per a retention schedule.
   * 'payload-stripped' — payload stripped for export or regulatory redaction.
   *
   * When lawful != 'none', the verifier classifies any hash mismatch at this
   * seq as LAWFUL_CHANGE rather than tampering, provided authority is present.
   */
  lawful: 'none' | 'erasure' | 'retention' | 'payload-stripped';
  /** Free-form structured payload. Values must be JSON-safe. */
  detail: Record<string, string | number | boolean | null>;
  /**
   * Hash of the previous event, or the all-zeros string for seq 1.
   * Assigned by append(); callers must not supply this field.
   */
  prevHash: string;
  /**
   * sha256(canonical({...event, hash: undefined})).
   * Assigned by append(); callers must not supply this field.
   */
  hash: string;
}

/**
 * Everything a caller supplies to append(). The three computed fields —
 * seq, prevHash and hash — are intentionally absent; append() derives them.
 * Any draft that carries those fields is rejected with a TypeError.
 */
export type AppendDraft = Omit<AuditEvent, 'seq' | 'prevHash' | 'hash'>;

// ---------------------------------------------------------------------------
// Seals
// ---------------------------------------------------------------------------

/**
 * An Ed25519 seal over a chain head.
 *
 * The signed payload is canonical({seq, hash, at, keyId}), so a seal binds a
 * specific position in the chain to a specific key at a specific time.
 */
export interface Seal {
  seq: number;
  hash: string;
  at: string;
  /** Fingerprint of the public key that signed this seal (from keys.ts). */
  keyId: string;
  /** Ed25519 signature over canonical({seq, hash, at, keyId}), base64-encoded. */
  signature: string;
}

// ---------------------------------------------------------------------------
// Anchors
// ---------------------------------------------------------------------------

/**
 * A write-once anchor record, produced by a create-only write (open 'wx').
 *
 * anchorDigest = sha256(canonical({seq, headHash, sealSignature})).
 * A second write to the same anchor file is refused at the filesystem level;
 * a differing digest raises ANCHOR_MISMATCH.
 */
export interface Anchor {
  seq: number;
  headHash: string;
  sealSignature: string;
  /** sha256(canonical({seq, headHash, sealSignature})) */
  anchorDigest: string;
  at: string;
}

// ---------------------------------------------------------------------------
// Verification findings
// ---------------------------------------------------------------------------

/**
 * Stable finding codes. The verifier, the CLI and all tests assert on these
 * strings. Do not rename. Additions are backward-compatible; removals are not.
 */
export type FindingCode =
  | 'HASH_MISMATCH'
  | 'LINK_BROKEN'
  | 'SEQ_GAP'
  | 'SEAL_INVALID'
  | 'ANCHOR_MISMATCH'
  | 'ANCHOR_MISSING'
  | 'LAWFUL_CHANGE'
  | 'VERSION_UNSUPPORTED';

export type FindingSeverity = 'error' | 'warn' | 'info';

export interface Finding {
  seq: number;
  code: FindingCode;
  severity: FindingSeverity;
  message: string;
  /** Present when code is LAWFUL_CHANGE — the authority that authorised it. */
  lawfulBy?: string;
}

// ---------------------------------------------------------------------------
// Verification result
// ---------------------------------------------------------------------------

export interface VerificationResult {
  /**
   * true only when findings contains no entry with severity 'error'.
   * A LAWFUL_CHANGE finding does not set ok=false.
   */
  ok: boolean;
  formatVersion: string;
  counts: {
    events: number;
    seals: number;
    anchors: number;
  };
  /**
   * Lowest seq carrying a non-lawful finding (severity 'error'), or null when
   * the chain is clean or all divergences are lawful.
   */
  firstDivergence: number | null;
  findings: Finding[];
}
