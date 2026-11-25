/**
 * Generate a verifiable anchora/1 audit bundle of Anchora's own Kiroween 2026
 * build milestones (steering, specs, hooks, Kiro CLI runs, custom agents, MCP).
 *
 * Deterministic: same seed, same events, same seals. Run with:
 *   npm run generate:kiro-audit
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { sha256Hex } from '../packages/core/src/crypto/hash.js'
import { publicKeyFromPrivate } from '../packages/core/src/crypto/keys.js'
import { createLog } from '../packages/core/src/chain/append.js'
import { createSeals } from '../packages/core/src/chain/seal.js'
import { createAnchor } from '../packages/core/src/chain/anchor.js'
import { FORMAT_VERSION } from '../packages/core/src/format.js'
import type { AppendDraft, Anchor, Seal } from '../packages/core/src/chain/types.js'

const SEED = 'anchora-kiro-build-audit/v1'

function pem(label: string, bytes: Uint8Array): string {
  return `-----BEGIN ${label}-----\n${Buffer.from(bytes).toString('base64')}\n-----END ${label}-----`
}

const MILESTONES: readonly AppendDraft[] = [
  {
    at: '2026-11-13T18:00:00.000Z',
    actor: { id: 'tradexy', role: 'owner' },
    action: 'governance.policy.update',
    subject: '.kiro/steering/product.md',
    outcome: 'committed',
    lawful: 'none',
    detail: { milestone: 'steering-initialised', rule: 'verifier-is-the-product' },
  },
  {
    at: '2026-11-16T19:04:18.000Z',
    actor: { id: 'kiro-cli', role: 'agent' },
    action: 'settings.feature.enable',
    subject: '.kiro/hooks/security-on-write.json',
    outcome: 'committed',
    lawful: 'none',
    detail: { commit: '7005bb7', trigger: 'PostToolUse', target: 'write' },
  },
  {
    at: '2026-11-16T19:05:00.000Z',
    actor: { id: 'kiro-cli', role: 'agent' },
    action: 'settings.feature.enable',
    subject: '.kiro/hooks/verify-on-stop.json',
    outcome: 'committed',
    lawful: 'none',
    detail: { commit: '7005bb7', trigger: 'Stop', gate: 'npm run verify' },
  },
  {
    at: '2026-11-18T18:14:57.000Z',
    actor: { id: 'tradexy', role: 'owner' },
    action: 'governance.policy.update',
    subject: '.kiro/specs/anchora-evidence/requirements.md',
    outcome: 'committed',
    lawful: 'none',
    detail: { commit: 'e1c4df9', earsRequirements: 15, coreSkeleton: 'anchora/1' },
  },
  {
    at: '2026-11-18T18:21:49.000Z',
    actor: { id: 'tradexy', role: 'owner' },
    action: 'governance.policy.update',
    subject: 'docs/demo-plan.md',
    outcome: 'committed',
    lawful: 'none',
    detail: { commit: '8ad99b7', fixtureTarget: 500, storyBeatSeq: 217 },
  },
  {
    at: '2026-11-18T18:25:23.000Z',
    actor: { id: 'kiro-cli', role: 'agent' },
    action: 'agents.deploy',
    subject: 'packages/core/src/crypto',
    outcome: 'committed',
    lawful: 'none',
    detail: { commit: 'e3dd8dc', tasks: '1-3', testsPassed: 44 },
  },
  {
    at: '2026-11-18T18:29:00.000Z',
    actor: { id: 'kiro-cli', role: 'agent' },
    action: 'agents.decision.record',
    subject: 'packages/core/src/crypto/canonical.test.ts',
    outcome: 'committed',
    lawful: 'none',
    detail: { finding: 'fast-check-v3-api', selfHealedByHook: true },
  },
  {
    at: '2026-11-18T18:32:48.000Z',
    actor: { id: 'kiro-cli', role: 'agent' },
    action: 'agents.deploy',
    subject: 'packages/core/src/chain',
    outcome: 'committed',
    lawful: 'none',
    detail: { commit: '929b562', tasks: '4-5', invariants: 'edit-delete-insert-reorder' },
  },
  {
    at: '2026-11-18T18:35:00.000Z',
    actor: { id: 'tradexy', role: 'security-lead' },
    action: 'governance.policy.update',
    subject: 'packages/core/src/chain/verify.ts',
    outcome: 'committed',
    lawful: 'none',
    detail: { fix: 'report-declared-lawful-changes-independently', caughtBy: 'human-review' },
  },
  {
    at: '2026-11-19T06:35:28.000Z',
    actor: { id: 'kiro-cli', role: 'agent' },
    action: 'agents.deploy',
    subject: 'tools/verify/verify.ts',
    outcome: 'committed',
    lawful: 'none',
    detail: { commit: 'b87fdbd', tasks: '6-8', offlineCli: true, seals: 9, anchors: 4 },
  },
  {
    at: '2026-11-19T07:36:55.000Z',
    actor: { id: 'kiro-cli', role: 'agent' },
    action: 'agents.deploy',
    subject: 'packages/core/src/capture + evidence',
    outcome: 'committed',
    lawful: 'none',
    detail: { commit: '19d8584', tasks: '9-10', standards: 3, coverageGuard: true },
  },
  {
    at: '2026-11-19T07:48:20.000Z',
    actor: { id: 'kiro-cli', role: 'agent' },
    action: 'agents.deploy',
    subject: 'apps/seal + apps/witness',
    outcome: 'committed',
    lawful: 'none',
    detail: { commit: 'd91e5d3', tasks: '11-14', appsCount: 2, sharedCore: '@anchora/core' },
  },
  {
    at: '2026-11-19T07:49:36.000Z',
    actor: { id: 'kiro-cli', role: 'agent' },
    action: 'routing.connector.add',
    subject: '.github/workflows/deploy.yml',
    outcome: 'committed',
    lawful: 'none',
    detail: { commit: '012b4b4', node: 22, webCryptoPolyfill: true },
  },
  {
    at: '2026-11-19T07:57:46.000Z',
    actor: { id: 'kiro-cli', role: 'agent' },
    action: 'settings.feature.enable',
    subject: 'apps/seal/src/App.test.tsx',
    outcome: 'committed',
    lawful: 'none',
    detail: { commit: 'f7bfe33', suiteMs: 1810, tests: 180 },
  },
  {
    at: '2026-11-20T12:20:30.000Z',
    actor: { id: 'kiro-cli', role: 'agent' },
    action: 'agents.deploy',
    subject: 'packages/core/src/ui/Intro.tsx',
    outcome: 'committed',
    lawful: 'none',
    detail: { commit: '4f4b4a4', addition: 'plain-english-start-here' },
  },
  {
    at: '2026-11-20T12:38:01.000Z',
    actor: { id: 'kiro-cli', role: 'agent' },
    action: 'agents.deploy',
    subject: 'site/index.html',
    outcome: 'committed',
    lawful: 'none',
    detail: { commit: '7147dfa', hero: 'northgate-bank-story' },
  },
  {
    at: '2026-11-24T07:49:53.000Z',
    actor: { id: 'tradexy', role: 'owner' },
    action: 'governance.policy.update',
    subject: 'RULES.md',
    outcome: 'committed',
    lawful: 'none',
    detail: { commit: '1d0b74c', purpose: 'single-source-of-truth-compliance' },
  },
  {
    at: '2026-11-24T08:14:33.000Z',
    actor: { id: 'kiro-cli', role: 'agent' },
    action: 'settings.feature.enable',
    subject: '.kiro/hooks/contract-on-core-change.json',
    outcome: 'committed',
    lawful: 'none',
    detail: { commit: 'c693d2b', trigger: 'PostFileSave' },
  },
  {
    at: '2026-11-24T08:15:00.000Z',
    actor: { id: 'tradexy', role: 'security-lead' },
    action: 'governance.policy.update',
    subject: 'exports/pre-publish-redaction',
    outcome: 'committed',
    lawful: 'payload-stripped',
    detail: { authority: 'tradexy', reason: 'strip-local-workstation-paths', fields: 'hostPath' },
  },
  {
    at: '2026-11-25T00:52:00.000Z',
    actor: { id: 'kiro-agent', role: 'agent' },
    action: 'routing.connector.add',
    subject: 'tools/mcp/server.ts',
    outcome: 'committed',
    lawful: 'none',
    detail: { transport: 'stdio-jsonrpc', tools: 4, offline: true },
  },
  {
    at: '2026-11-25T00:54:00.000Z',
    actor: { id: 'kiro-agent', role: 'agent' },
    action: 'roles.grant',
    subject: '.kiro/agents/security-auditor.json',
    outcome: 'committed',
    lawful: 'none',
    detail: { customAgents: 2, validatedByKiroCli: true },
  },
  {
    at: '2026-11-25T00:56:00.000Z',
    actor: { id: 'kiro-agent', role: 'agent' },
    action: 'agents.deploy',
    subject: '.kiro/powers/anchora/POWER.md',
    outcome: 'committed',
    lawful: 'none',
    detail: { powerName: 'anchora-evidence', category: 'Skeleton Crew' },
  },
  {
    at: '2026-11-25T01:05:00.000Z',
    actor: { id: 'kiro-agent', role: 'agent' },
    action: 'agents.deploy',
    subject: 'apps/seal/src/ChainVisualizer.tsx',
    outcome: 'committed',
    lawful: 'none',
    detail: { feature: 'svg-chain-fracture-plus-rewrite-attack' },
  },
  {
    at: '2026-11-25T01:10:00.000Z',
    actor: { id: 'system', role: 'scheduler' },
    action: 'agents.decision.record',
    subject: 'release:kiroween-2026-rc1',
    outcome: 'committed',
    lawful: 'none',
    detail: { decision: 'verified', suitesPassing: true, zeroNetwork: true },
  },
]

async function main() {
  const privateBytes = Uint8Array.from(Buffer.from(await sha256Hex(SEED), 'hex'))
  const privateKeyPem = pem('ED25519 PRIVATE KEY', privateBytes)
  const { publicKeyPem, fingerprint } = await publicKeyFromPrivate(privateKeyPem)

  const log = createLog({ formatVersion: FORMAT_VERSION })
  for (const draft of MILESTONES) {
    await log.append(draft)
  }

  const events = [...log.events()]
  const seals: Seal[] = await createSeals(events, privateKeyPem, publicKeyPem, {
    every: 6,
    at: (event) => event.at,
  })

  const anchors: Anchor[] = []
  for (const seal of seals) {
    if (seal.seq % 12 === 0) anchors.push(await createAnchor(seal))
  }

  const bundle = {
    formatVersion: FORMAT_VERSION,
    generatedAt: MILESTONES[0]!.at,
    seed: SEED,
    publicKeyPem,
    keyFingerprint: fingerprint,
    events,
    seals,
    anchors,
  }

  const here = dirname(fileURLToPath(import.meta.url))
  const out = join(here, '..', 'packages', 'core', 'data', 'kiro-audit.bundle.json')
  await mkdir(dirname(out), { recursive: true })
  await writeFile(out, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8')

  console.log(`wrote ${out}`)
  console.log(`events=${events.length} seals=${seals.length} anchors=${anchors.length}`)
  console.log(`key fingerprint=${fingerprint}`)
}

await main()
