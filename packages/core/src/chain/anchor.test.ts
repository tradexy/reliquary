import { describe, it, expect } from 'vitest'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createAnchor, anchorDigestOf } from './anchor.js'
import { writeAnchorCreateOnly, readAnchors } from './anchor-store.js'
import type { Anchor, Seal } from './types.js'

const SEAL: Seal = {
  seq: 120,
  hash: 'a'.repeat(64),
  at: '2026-11-01T10:00:00.000Z',
  keyId: 'b'.repeat(32),
  signature: 'c2lnbmF0dXJl',
}

async function tempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'anchora-anchor-'))
}

describe('createAnchor', () => {
  it('carries the seal head and signature', async () => {
    const anchor = await createAnchor(SEAL)
    expect(anchor.seq).toBe(SEAL.seq)
    expect(anchor.headHash).toBe(SEAL.hash)
    expect(anchor.sealSignature).toBe(SEAL.signature)
    expect(anchor.anchorDigest).toHaveLength(64)
  })

  it('produces a deterministic digest', async () => {
    const a = await createAnchor(SEAL)
    const b = await createAnchor(SEAL)
    expect(a.anchorDigest).toBe(b.anchorDigest)
    expect(a.anchorDigest).toBe(await anchorDigestOf(SEAL.seq, SEAL.hash, SEAL.signature))
  })

  it('changes the digest when any component changes', async () => {
    const base = await createAnchor(SEAL)
    const other = await createAnchor({ ...SEAL, hash: 'd'.repeat(64) })
    expect(other.anchorDigest).not.toBe(base.anchorDigest)
  })
})

describe('create-only anchor store', () => {
  it('writes an anchor and reads it back', async () => {
    const dir = await tempDir()
    const anchor = await createAnchor(SEAL)

    await expect(writeAnchorCreateOnly(dir, anchor)).resolves.toBe('created')

    const stored = await readAnchors(dir)
    expect(stored).toHaveLength(1)
    expect(stored[0]?.anchorDigest).toBe(anchor.anchorDigest)
  })

  it('refuses a second write to the same key', async () => {
    const dir = await tempDir()
    const anchor = await createAnchor(SEAL)

    await writeAnchorCreateOnly(dir, anchor)
    await expect(writeAnchorCreateOnly(dir, anchor)).resolves.toBe('exists')
  })

  it('leaves the original bytes untouched on a refused overwrite', async () => {
    const dir = await tempDir()
    const anchor = await createAnchor(SEAL)
    await writeAnchorCreateOnly(dir, anchor)

    const forged: Anchor = { ...anchor, anchorDigest: 'f'.repeat(64) }
    await writeAnchorCreateOnly(dir, forged)

    const raw = await readFile(join(dir, 'anchor-000120.json'), 'utf8')
    expect(JSON.parse(raw).anchorDigest).toBe(anchor.anchorDigest)
  })

  it('orders anchors by seq', async () => {
    const dir = await tempDir()
    const later = await createAnchor({ ...SEAL, seq: 480 })
    const earlier = await createAnchor({ ...SEAL, seq: 120 })
    await writeAnchorCreateOnly(dir, later)
    await writeAnchorCreateOnly(dir, earlier)

    const stored = await readAnchors(dir)
    expect(stored.map((a) => a.seq)).toEqual([120, 480])
  })
})
