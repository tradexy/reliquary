import { describe, it, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Anchor, AuditEvent, Seal } from '../chain/types.js'
import { verifyChain } from '../chain/verify.js'
import { CONTROLS, evaluateControls } from './standards.js'
import { buildBundle, summary } from './export.js'

interface Seeded {
  formatVersion: string
  publicKeyPem: string
  keyFingerprint: string
  events: AuditEvent[]
  seals: Seal[]
  anchors: Anchor[]
}

async function seeded(): Promise<Seeded> {
  const path = join(process.cwd(), 'packages', 'core', 'data', 'bundle.json')
  return JSON.parse(await readFile(path, 'utf8')) as Seeded
}

describe('standards', () => {
  it('has 3-5 controls for each of the three standards', () => {
    for (const s of ['SOC 2', 'ISO 27001', 'EU AI Act']) {
      const n = CONTROLS.filter((c) => c.standard === s).length
      expect(n).toBeGreaterThanOrEqual(3)
      expect(n).toBeLessThanOrEqual(5)
    }
  })

  it('every control resolves to known events in the seeded bundle', async () => {
    const b = await seeded()
    const bySeq = new Map(b.events.map((e) => [e.seq, e]))
    const results = evaluateControls(b.events)
    expect(results).toHaveLength(CONTROLS.length)
    for (const r of results) {
      expect(r.complete, `${r.standard} ${r.control}`).toBe(true)
      expect(r.considered).toBe(500)
      for (const seq of r.eventSeqs) expect(bySeq.has(seq)).toBe(true)
      const control = CONTROLS.find((c) => c.control === r.control && c.standard === r.standard)!
      expect(r.eventSeqs).toEqual(b.events.filter((e) => control.query(e)).map((e) => e.seq))
    }
  })

  it('maps the seeded refusal to CC7.2 and lawful events to retention controls', async () => {
    const b = await seeded()
    const results = evaluateControls(b.events)
    const find = (c: string) => results.find((r) => r.control === c)!
    const refused = b.events.filter((e) => e.outcome === 'refused').map((e) => e.seq)
    expect(find('CC7.2').eventSeqs).toEqual(refused)
    expect(find('Art. 19').eventSeqs).toEqual([288])
    expect(find('A.8.10').eventSeqs).toEqual([144, 288])
  })

  it('reports complete=false for a control with no matching events', async () => {
    const b = await seeded()
    const onlyInvites = b.events.filter((e) => e.action === 'identity.user.invite')
    const results = evaluateControls(onlyInvites)
    const art14 = results.find((r) => r.control === 'Art. 14')!
    expect(art14.eventSeqs).toEqual([])
    expect(art14.complete).toBe(false)
    expect(art14.considered).toBe(onlyInvites.length)
    expect(results.find((r) => r.control === 'CC6.1')!.complete).toBe(true)
  })

  it('reports every control incomplete for an empty log', () => {
    expect(evaluateControls([]).every((r) => !r.complete && r.considered === 0)).toBe(true)
  })
})

describe('export', () => {
  async function build() {
    const b = await seeded()
    const bundle = buildBundle({
      events: b.events,
      seals: b.seals,
      anchors: b.anchors,
      publicKeyPem: b.publicKeyPem,
      keyFingerprint: b.keyFingerprint,
      controls: evaluateControls(b.events),
      exportedAt: '2026-11-03T00:00:00.000Z',
    })
    return { b, bundle }
  }

  it('has the anchora/1 shape', async () => {
    const { bundle } = await build()
    expect(Object.keys(bundle).sort()).toEqual(
      ['anchors', 'controls', 'events', 'exportedAt', 'formatVersion', 'keyFingerprint',
        'lawfulManifest', 'publicKeyPem', 'seals'].sort(),
    )
    expect(bundle.formatVersion).toBe('anchora/1')
    expect(bundle.lawfulManifest.map((m) => [m.seq, m.kind])).toEqual([
      [144, 'erasure'], [288, 'retention'], [401, 'payload-stripped'],
    ])
  })

  it('summary gives recomputed counts plus the fingerprint', async () => {
    const { b, bundle } = await build()
    expect(summary(bundle)).toEqual({
      events: 500,
      seals: 9,
      anchors: 4,
      lawfulChanges: 3,
      controls: CONTROLS.length,
      keyFingerprint: b.keyFingerprint,
    })
  })

  it('round-trips through JSON and verifies', async () => {
    const { b, bundle } = await build()
    const parsed = JSON.parse(JSON.stringify(bundle)) as typeof bundle
    const result = await verifyChain(parsed, parsed.publicKeyPem, b.keyFingerprint)
    expect(result.ok).toBe(true)
    expect(result.firstDivergence).toBeNull()
    expect(result.counts).toEqual({ events: 500, seals: 9, anchors: 4 })
    expect(result.findings.filter((f) => f.code === 'LAWFUL_CHANGE')).toHaveLength(3)
  })

  it('is a copy: editing the source after export does not change the bundle', async () => {
    const { b, bundle } = await build()
    b.events[0]!.subject = 'changed'
    expect(bundle.events[0]!.subject).not.toBe('changed')
  })

  it('a doctored exported event is caught at its seq', async () => {
    const { b, bundle } = await build()
    bundle.events[9] = { ...bundle.events[9]!, subject: 'doctored' }
    const result = await verifyChain(bundle, bundle.publicKeyPem, b.keyFingerprint)
    expect(result.ok).toBe(false)
    expect(result.firstDivergence).toBe(10)
  })
})
