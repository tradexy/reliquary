// Chain sub-package — append, verify, findings, types (Tasks 4–5).
export type {
  AuditEvent,
  AppendDraft,
  Seal,
  Anchor,
  Finding,
  FindingCode,
  FindingSeverity,
  VerificationResult,
} from './types.js';
export { createLog, GENESIS_PREV_HASH } from './append.js';
export type { Log, LogOptions } from './append.js';
export { verifyChain } from './verify.js';
export type { VerifyBundle } from './verify.js';
export {
  makeFinding,
  makeHashMismatch,
  makeLinkBroken,
  makeSeqGap,
  makeSealInvalid,
  makeAnchorMismatch,
  makeAnchorMissing,
  makeLawfulChange,
  makeVersionUnsupported,
  sortFindings,
  firstDivergenceSeq,
} from './findings.js';
export { createSeal, createSeals, verifySeal, sealPayload } from './seal.js';
export { createAnchor, anchorDigestOf } from './anchor.js';
export { eventPreimage } from './preimage.js';
