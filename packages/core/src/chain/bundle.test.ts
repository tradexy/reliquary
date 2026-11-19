import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { verifyChain } from './verify.js'
import { verifySeal } from './seal.js'
import { createAnchor } from './anchor.js'
import type { Anchor, AuditEvent, Seal } from './types.js'

interface Bundle {
  formatVersion: string
  generatedAt: string
  publicKeyPem: string
  keyFingerprint: string
  events: AuditEvent[]
  seals: Seal[]
  anchors: Anchor[]
}

async function loadBundle(): Promise<Bundle> {
  const path = join(process.cwd(), 'packages', 'core', 'data', 'bundle.json')
  return JSON.parse(await readFile(path, 'utf8')) as Bundle
}

describe('committed demo bundle', () => {
  it('has the shape the demo expects', async () => {
    const b = await loadBundle()
    expect(b.formatVersion).toBe('anchora/1')
    expect(b.events).toHaveLength(500)
    expect(b.seals).toHaveLength(9)
    expect(b.anchors).toHaveLength(4)
    expect(b.keyFingerprint).toHaveLength(32)
  })

  it('verifies clean', async () => {
    const b = await loadBundle()
    const result = await verifyChain(
      { formatVersion: b.formatVersion, events: b.events, seals: b.seals, anchors: b.anchors },
      b.publicKeyPem,
      b.keyFingerprint,
    )
    expect(result.findings.filter((f) => f.severity === 'error')).toEqual([])
    expect(result.ok).toBe(true)
    expect(result.firstDivergence).toBeNull()
  })

  it('reports exactly three lawful changes', async () => {
    const b = await loadBundle()
    const result = await verifyChain(
      { formatVersion: b.formatVersion, events: b.events, seals: b.seals, anchors: b.anchors },
      b.publicKeyPem,
    )
    const lawful = result.findings.filter((f) => f.code === 'LAWFUL_CHANGE')
    expect(lawful.map((f) => f.seq).sort((x, y) => x - y)).toEqual([144, 288, 401])
  })

  it('every seal verifies against the published key', async () => {
    const b = await loadBundle()
    for (const seal of b.seals) {
      await expect(verifySeal(seal, b.publicKeyPem)).resolves.toBe(true)
    }
  })

  it('every anchor digest recomputes', async () => {
    const b = await loadBundle()
    const sealBySeq = new Map(b.seals.map((s) => [s.seq, s]))
    for (const anchor of b.anchors) {
      const seal = sealBySeq.get(anchor.seq)
      expect(seal).toBeDefined()
      const rebuilt = await createAnchor(seal!)
      expect(rebuilt.anchorDigest).toBe(anchor.anchorDigest)
    }
  })

  it('detects a single edited field at the right seq', async () => {
    const b = await loadBundle()
    const events = b.events.map((e) => ({ ...e }))
    events[216] = { ...events[216]!, subject: 'silently-changed@example.com' }

    const result = await verifyChain(
      { formatVersion: b.formatVersion, events, seals: b.seals, anchors: b.anchors },
      b.publicKeyPem,
    )
    const mismatch = result.findings.find((f) => f.code === 'HASH_MISMATCH')
    expect(mismatch?.seq).toBe(217)
    expect(result.firstDivergence).toBe(217)
    expect(result.ok).toBe(false)
  })
})
