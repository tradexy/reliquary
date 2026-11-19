/**
 * Seal creation and verification.
 *
 * A seal binds a chain position to a key at a point in time:
 *   payload   = { seq, hash, at, keyId }
 *   signature = Ed25519(canonical(payload))
 *
 * The key lives outside the event store (see design.md §Seals). In this build it
 * is a PEM file outside the data directory; in production it is held in a KMS or
 * HSM and the application never sees it. That difference is labelled in the UI.
 */

import { canonical } from '../crypto/canonical.js'
import { keyIdFromPublicKey } from '../crypto/keys.js'
import { signPayload, verifyPayload } from '../crypto/sign.js'
import type { AuditEvent, Seal } from './types.js'

/** The exact object that is signed. Any change here invalidates every seal. */
export function sealPayload(seq: number, hash: string, at: string, keyId: string) {
  return { seq, hash, at, keyId }
}

/** Create a seal over `event` using the supplied key material. */
export async function createSeal(
  event: AuditEvent,
  privateKeyPem: string,
  publicKeyPem: string,
  at: string,
): Promise<Seal> {
  const keyId = await keyIdFromPublicKey(publicKeyPem)
  const payload = sealPayload(event.seq, event.hash, at, keyId)
  const signature = await signPayload(payload, privateKeyPem)
  return { seq: event.seq, hash: event.hash, at, keyId, signature }
}

/**
 * Create seals at a fixed interval across a chain: every `every` events, plus the
 * final head if it has not just been sealed. Sealing the head matters, because an
 * append after the last seal is otherwise unanchored.
 */
export async function createSeals(
  events: readonly AuditEvent[],
  privateKeyPem: string,
  publicKeyPem: string,
  options: { every: number; at: (event: AuditEvent) => string },
): Promise<Seal[]> {
  if (options.every < 1) throw new RangeError('seal interval must be >= 1')
  const seals: Seal[] = []
  for (let i = 0; i < events.length; i += 1) {
    const event = events[i]!
    const isInterval = (i + 1) % options.every === 0
    const isLast = i === events.length - 1
    if (isInterval || isLast) {
      seals.push(await createSeal(event, privateKeyPem, publicKeyPem, options.at(event)))
    }
  }
  return seals
}

/** Verify a seal's signature against a public key. */
export async function verifySeal(seal: Seal, publicKeyPem: string): Promise<boolean> {
  const payload = sealPayload(seal.seq, seal.hash, seal.at, seal.keyId)
  return verifyPayload(payload, seal.signature, publicKeyPem)
}
