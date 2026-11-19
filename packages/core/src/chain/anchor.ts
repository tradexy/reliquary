/**
 * Anchor records.
 *
 * An anchor is the copy of a signed chain head that goes somewhere the database
 * owner cannot rewrite. This module builds the digest; the create-only write lives
 * in `anchor-store.ts`, which is Node-only and deliberately not exported from the
 * package barrel so the browser bundle stays clean.
 */

import { canonical } from '../crypto/canonical.js'
import { sha256Hex } from '../crypto/hash.js'
import type { Anchor, Seal } from './types.js'

/** The canonical digest of an anchor. Changing this invalidates stored anchors. */
export function anchorDigestOf(seq: number, headHash: string, sealSignature: string) {
  return sha256Hex(canonical({ seq, headHash, sealSignature }))
}

/** Build an anchor record from a seal. */
export async function createAnchor(seal: Seal): Promise<Anchor> {
  return {
    seq: seal.seq,
    headHash: seal.hash,
    sealSignature: seal.signature,
    anchorDigest: await anchorDigestOf(seal.seq, seal.hash, seal.signature),
    at: seal.at,
  }
}
