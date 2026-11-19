import { describe, it, expect } from 'vitest'
import { createLog } from './append.js'
import { createSeal, createSeals, verifySeal } from './seal.js'
import { generateKeyPair } from '../crypto/keys.js'
import { FORMAT_VERSION } from '../format.js'
import type { AppendDraft } from './types.js'

const AT = '2026-11-01T09:00:00.000Z'

function draft(overrides: Partial<AppendDraft> = {}): AppendDraft {
  return {
    at: AT,
    actor: { id: 'dana.okafor', role: 'owner' },
    action: 'identity.user.invite',
    subject: 'new-analyst@example.com',
    outcome: 'committed',
    lawful: 'none',
    detail: { note: 'invited' },
    ...overrides,
  }
}

async function threeEvents() {
  const log = createLog({ formatVersion: FORMAT_VERSION })
  for (let i = 0; i < 3; i += 1) await log.append(draft({ subject: `subject-${i}` }))
  return log.events()
}

describe('createSeal', () => {
  it('binds seq, hash, time and key id', async () => {
    const [event] = await threeEvents()
    const kp = await generateKeyPair()
    const seal = await createSeal(event!, kp.privateKeyPem, kp.publicKeyPem, AT)

    expect(seal.seq).toBe(event!.seq)
    expect(seal.hash).toBe(event!.hash)
    expect(seal.at).toBe(AT)
    expect(seal.keyId).toHaveLength(32)
    expect(seal.signature.length).toBeGreaterThan(40)
  })

  it('verifies with the matching public key', async () => {
    const [event] = await threeEvents()
    const kp = await generateKeyPair()
    const seal = await createSeal(event!, kp.privateKeyPem, kp.publicKeyPem, AT)
    await expect(verifySeal(seal, kp.publicKeyPem)).resolves.toBe(true)
  })

  it('fails to verify with a different public key', async () => {
    const [event] = await threeEvents()
    const kp = await generateKeyPair()
    const other = await generateKeyPair()
    const seal = await createSeal(event!, kp.privateKeyPem, kp.publicKeyPem, AT)
    await expect(verifySeal(seal, other.publicKeyPem)).resolves.toBe(false)
  })

  it('fails when the sealed hash is altered', async () => {
    const [event] = await threeEvents()
    const kp = await generateKeyPair()
    const seal = await createSeal(event!, kp.privateKeyPem, kp.publicKeyPem, AT)
    const forged = { ...seal, hash: '0'.repeat(64) }
    await expect(verifySeal(forged, kp.publicKeyPem)).resolves.toBe(false)
  })

  it('fails when the timestamp is altered', async () => {
    const [event] = await threeEvents()
    const kp = await generateKeyPair()
    const seal = await createSeal(event!, kp.privateKeyPem, kp.publicKeyPem, AT)
    const forged = { ...seal, at: '2026-11-02T09:00:00.000Z' }
    await expect(verifySeal(forged, kp.publicKeyPem)).resolves.toBe(false)
  })
})

describe('createSeals', () => {
  it('seals every interval plus the head', async () => {
    const log = createLog({ formatVersion: FORMAT_VERSION })
    for (let i = 0; i < 10; i += 1) await log.append(draft({ subject: `s-${i}` }))
    const kp = await generateKeyPair()

    const seals = await createSeals(log.events(), kp.privateKeyPem, kp.publicKeyPem, {
      every: 4,
      at: () => AT,
    })

    // 4, 8, then the head at 10.
    expect(seals.map((s) => s.seq)).toEqual([4, 8, 10])
  })

  it('does not duplicate a seal when the head is already on the interval', async () => {
    const log = createLog({ formatVersion: FORMAT_VERSION })
    for (let i = 0; i < 8; i += 1) await log.append(draft({ subject: `s-${i}` }))
    const kp = await generateKeyPair()

    const seals = await createSeals(log.events(), kp.privateKeyPem, kp.publicKeyPem, {
      every: 4,
      at: () => AT,
    })

    expect(seals.map((s) => s.seq)).toEqual([4, 8])
  })

  it('every seal verifies', async () => {
    const log = createLog({ formatVersion: FORMAT_VERSION })
    for (let i = 0; i < 6; i += 1) await log.append(draft({ subject: `s-${i}` }))
    const kp = await generateKeyPair()
    const seals = await createSeals(log.events(), kp.privateKeyPem, kp.publicKeyPem, {
      every: 2,
      at: () => AT,
    })

    for (const seal of seals) {
      await expect(verifySeal(seal, kp.publicKeyPem)).resolves.toBe(true)
    }
  })

  it('rejects an interval below one', async () => {
    const kp = await generateKeyPair()
    await expect(
      createSeals([], kp.privateKeyPem, kp.publicKeyPem, { every: 0, at: () => AT }),
    ).rejects.toThrow(RangeError)
  })
})
