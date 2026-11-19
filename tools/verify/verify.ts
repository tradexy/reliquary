/**
 * Offline verifier — the assessor's tool.
 *
 * Takes an exported bundle and a public key (or fingerprint), verifies it, and
 * exits non-zero on any finding. It imports nothing from React and makes no
 * network calls, so it can be copied to a sealed machine beside the bundle.
 */

import { readFile } from 'node:fs/promises'
import { verifyChain } from '../../packages/core/src/chain/verify.js'
import type { Anchor, AuditEvent, Seal, VerificationResult } from '../../packages/core/src/chain/types.js'

export interface BundleFile {
  formatVersion: string
  generatedAt?: string
  publicKeyPem: string
  keyFingerprint?: string
  events: AuditEvent[]
  seals: Seal[]
  anchors: Anchor[]
}

export interface VerifyOptions {
  /** Expected key fingerprint. When supplied, a mismatch is a finding. */
  expectFingerprint?: string
}

/** Verify a bundle file on disk. */
export async function verifyBundleFile(
  path: string,
  options: VerifyOptions = {},
): Promise<{ result: VerificationResult; bundle: BundleFile }> {
  const bundle = JSON.parse(await readFile(path, 'utf8')) as BundleFile
  const result = await verifyChain(
    {
      formatVersion: bundle.formatVersion,
      events: bundle.events,
      seals: bundle.seals,
      anchors: bundle.anchors,
    },
    bundle.publicKeyPem,
    options.expectFingerprint ?? bundle.keyFingerprint,
  )
  return { result, bundle }
}

const CODE_ORDER = ['VERSION_UNSUPPORTED', 'SEQ_GAP', 'LINK_BROKEN', 'HASH_MISMATCH', 'SEAL_INVALID', 'ANCHOR_MISMATCH', 'ANCHOR_MISSING', 'LAWFUL_CHANGE']

/** Human-readable report. Stable enough to paste into a ticket. */
export function formatReport(result: VerificationResult, bundle: BundleFile): string {
  const lines: string[] = []
  lines.push('Anchora bundle verification')
  lines.push(`  format      ${result.formatVersion}`)
  lines.push(`  events      ${result.counts.events}`)
  lines.push(`  seals       ${result.counts.seals}`)
  lines.push(`  anchors     ${result.counts.anchors}`)
  lines.push(`  key         ${bundle.keyFingerprint ?? '(none published)'}`)
  lines.push('')

  if (result.findings.length === 0) {
    lines.push('  No findings. Every hash, link, sequence, seal and anchor recomputed.')
  } else {
    const sorted = [...result.findings].sort(
      (a, b) => a.seq - b.seq || CODE_ORDER.indexOf(a.code) - CODE_ORDER.indexOf(b.code),
    )
    for (const f of sorted) {
      lines.push(`  ${f.severity.toUpperCase().padEnd(5)} seq ${String(f.seq).padStart(4)}  ${f.code.padEnd(18)} ${f.message}`)
    }
  }

  lines.push('')
  lines.push(`  result      ${result.ok ? 'PASS' : 'FAIL'}`)
  lines.push(`  divergence  ${result.firstDivergence === null ? 'none' : result.firstDivergence}`)
  return lines.join('\n')
}

/** Machine-readable JSON report. */
export function jsonReport(result: VerificationResult, bundle: BundleFile) {
  return {
    ok: result.ok,
    formatVersion: result.formatVersion,
    counts: result.counts,
    firstDivergence: result.firstDivergence,
    keyFingerprint: bundle.keyFingerprint ?? null,
    findings: result.findings,
  }
}
