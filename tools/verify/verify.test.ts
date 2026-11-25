// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { verifyBundleFile, formatReport, jsonReport } from './verify.js'

const BUNDLE = join(process.cwd(), 'packages', 'core', 'data', 'bundle.json')

async function doctored(): Promise<string> {
  const raw = JSON.parse(await readFile(BUNDLE, 'utf8'))
  raw.events[216].subject = 'silently-changed@example.com'
  const dir = await mkdtemp(join(tmpdir(), 'anchora-bundle-'))
  const path = join(dir, 'doctored.json')
  await writeFile(path, JSON.stringify(raw), 'utf8')
  return path
}

describe('offline verifier', () => {
  it('passes a clean bundle', async () => {
    const { result } = await verifyBundleFile(BUNDLE)
    expect(result.ok).toBe(true)
    expect(result.findings.filter((f) => f.severity === 'error')).toEqual([])
  })

  it('fails a doctored bundle at the edited seq', async () => {
    const { result } = await verifyBundleFile(await doctored())
    expect(result.ok).toBe(false)
    expect(result.firstDivergence).toBe(217)
    expect(result.findings.some((f) => f.code === 'HASH_MISMATCH' && f.seq === 217)).toBe(true)
  })

  it('treats a wrong expected fingerprint as a failure', async () => {
    const { result } = await verifyBundleFile(BUNDLE, { expectFingerprint: 'f'.repeat(32) })
    expect(result.ok).toBe(false)
    expect(result.findings.some((f) => f.code === 'SEAL_INVALID')).toBe(true)
  })

  it('reports the three lawful changes without failing', async () => {
    const { result } = await verifyBundleFile(BUNDLE)
    const lawful = result.findings.filter((f) => f.code === 'LAWFUL_CHANGE')
    expect(lawful).toHaveLength(3)
    expect(result.ok).toBe(true)
  })

  it('formats a human report that names the result and divergence', async () => {
    const clean = await verifyBundleFile(BUNDLE)
    const okText = formatReport(clean.result, clean.bundle)
    expect(okText).toContain('result      PASS')
    expect(okText).toContain('divergence  none')

    const bad = await verifyBundleFile(await doctored())
    const badText = formatReport(bad.result, bad.bundle)
    expect(badText).toContain('result      FAIL')
    expect(badText).toContain('divergence  217')
  })

  it('emits machine-readable JSON', async () => {
    const { result, bundle } = await verifyBundleFile(await doctored())
    const json = jsonReport(result, bundle)
    expect(json.ok).toBe(false)
    expect(json.firstDivergence).toBe(217)
    expect(json.counts.events).toBe(500)
    expect(Array.isArray(json.findings)).toBe(true)
  })
})
