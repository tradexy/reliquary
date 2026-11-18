/**
 * Helpers to build Finding objects and sort them by seq.
 *
 * Keeping construction here — rather than inline in verify.ts — means the
 * shape is consistent and the severity mapping is a single source of truth.
 */

import type { Finding, FindingCode, FindingSeverity } from './types.js';

// ---------------------------------------------------------------------------
// Severity map
// ---------------------------------------------------------------------------

/**
 * Default severity for each finding code.
 *
 * LAWFUL_CHANGE is 'info': it records an authorised modification, not a fault.
 * Everything else that indicates a structural problem is 'error'.
 * VERSION_UNSUPPORTED is 'error' because the verifier cannot proceed safely.
 */
const DEFAULT_SEVERITY: Record<FindingCode, FindingSeverity> = {
  HASH_MISMATCH: 'error',
  LINK_BROKEN: 'error',
  SEQ_GAP: 'error',
  SEAL_INVALID: 'error',
  ANCHOR_MISMATCH: 'error',
  ANCHOR_MISSING: 'error',
  LAWFUL_CHANGE: 'info',
  VERSION_UNSUPPORTED: 'error',
};

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

export function makeFinding(
  seq: number,
  code: FindingCode,
  message: string,
  lawfulBy?: string,
): Finding {
  const finding: Finding = {
    seq,
    code,
    severity: DEFAULT_SEVERITY[code],
    message,
  };
  if (lawfulBy !== undefined) {
    finding.lawfulBy = lawfulBy;
  }
  return finding;
}

export function makeHashMismatch(seq: number, stored: string, recomputed: string): Finding {
  return makeFinding(
    seq,
    'HASH_MISMATCH',
    `seq ${seq}: stored hash ${stored.slice(0, 8)}… does not match recomputed hash ${recomputed.slice(0, 8)}…`,
  );
}

export function makeLinkBroken(seq: number, storedPrev: string, actualPrev: string): Finding {
  return makeFinding(
    seq,
    'LINK_BROKEN',
    `seq ${seq}: prevHash ${storedPrev.slice(0, 8)}… does not match previous event hash ${actualPrev.slice(0, 8)}…`,
  );
}

export function makeSeqGap(expected: number, actual: number): Finding {
  return makeFinding(
    actual,
    'SEQ_GAP',
    `expected seq ${expected}, found seq ${actual} — ${actual - expected} event(s) missing`,
  );
}

export function makeSealInvalid(seq: number, reason: string): Finding {
  return makeFinding(seq, 'SEAL_INVALID', `seal at seq ${seq}: ${reason}`);
}

export function makeAnchorMismatch(seq: number, stored: string, recomputed: string): Finding {
  return makeFinding(
    seq,
    'ANCHOR_MISMATCH',
    `anchor at seq ${seq}: stored digest ${stored.slice(0, 8)}… does not match recomputed digest ${recomputed.slice(0, 8)}…`,
  );
}

export function makeAnchorMissing(seq: number): Finding {
  return makeFinding(
    seq,
    'ANCHOR_MISSING',
    `anchor at seq ${seq} references a hash not present in the chain`,
  );
}

export function makeLawfulChange(seq: number, kind: string, authority: string): Finding {
  return makeFinding(
    seq,
    'LAWFUL_CHANGE',
    `seq ${seq}: lawful ${kind} authorised by ${authority}`,
    authority,
  );
}

export function makeVersionUnsupported(found: string, expected: string): Finding {
  return makeFinding(
    0,
    'VERSION_UNSUPPORTED',
    `bundle formatVersion "${found}" is not supported by this verifier (expected "${expected}")`,
  );
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

/**
 * Returns a new array of findings sorted by seq ascending.
 * Within the same seq, error severity sorts before info.
 */
export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    if (a.seq !== b.seq) return a.seq - b.seq;
    // error before info at the same seq
    if (a.severity === b.severity) return 0;
    return a.severity === 'error' ? -1 : 1;
  });
}

/**
 * Returns the lowest seq carrying an 'error' finding, or null if none.
 */
export function firstDivergenceSeq(findings: Finding[]): number | null {
  const errors = findings.filter((f) => f.severity === 'error');
  if (errors.length === 0) return null;
  return Math.min(...errors.map((f) => f.seq));
}
