/**
 * Generate the committed demo evidence stream.
 *
 * Deterministic: same seed, same events, same seals. Run with:
 *   npx vite-node scripts/generate-stream.ts
 *
 * The signing key is derived from a fixed seed and is NOT committed. Only the
 * public key and its fingerprint ship, so the apps can verify seals but cannot
 * mint new ones. In production the private key never leaves a KMS or HSM.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { sha256Hex } from '../packages/core/src/crypto/hash.js'
import { publicKeyFromPrivate } from '../packages/core/src/crypto/keys.js'
import { createLog } from '../packages/core/src/chain/append.js'
import { createSeals } from '../packages/core/src/chain/seal.js'
import { createAnchor } from '../packages/core/src/chain/anchor.js'
import { CATALOGUE } from '../packages/core/src/capture/catalogue.js'
import { FORMAT_VERSION } from '../packages/core/src/format.js'
import type { AppendDraft, Anchor, Seal } from '../packages/core/src/chain/types.js'

const SEED = 'anchora-demo-stream/v1'
const EVENT_COUNT = 500
const BASE = Date.parse('2026-11-01T09:00:00.000Z')
const STEP_MS = 137_000

/** mulberry32 — small, deterministic, good enough for fixtures. */
function prng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pem(label: string, bytes: Uint8Array): string {
  return `-----BEGIN ${label}-----\n${Buffer.from(bytes).toString('base64')}\n-----END ${label}-----`
}

const ACTORS = [
  { id: 'dana.okafor', role: 'owner', weight: 3 },
  { id: 'ravi.menon', role: 'security-lead', weight: 3 },
  { id: 'alina.petrova', role: 'auditor', weight: 1 },
  { id: 'system', role: 'scheduler', weight: 2 },
]

const SUBJECTS = [
  'analyst.04@northgate.example',
  'analyst.11@northgate.example',
  'contract-review-agent',
  'claims-triage-agent',
  'connector:servicenow',
  'connector:sharepoint',
  'route:eu-west-models',
  'flag:outbound-agent-calls',
  'guardrail:classification-ceiling',
  'policy:retention-90d',
]

/** Actions weighted so identity and agent work dominate, like a real tenant. */
const ACTION_WEIGHTS: Array<[string, number]> = [
  ['identity.user.invite', 6],
  ['identity.user.suspend', 3],
  ['identity.user.reactivate', 2],
  ['roles.grant', 5],
  ['roles.revoke', 3],
  ['agents.deploy', 4],
  ['agents.disable', 2],
  ['agents.guardrail.ceiling.raise', 2],
  ['agents.guardrail.ceiling.lower', 2],
  ['routing.connector.add', 3],
  ['routing.connector.remove', 2],
  ['settings.feature.enable', 3],
  ['settings.feature.disable', 2],
  ['governance.policy.update', 3],
]

function weightedPick(random: () => number, entries: Array<[string, number]>): string {
  const total = entries.reduce((sum, [, w]) => sum + w, 0)
  let n = random() * total
  for (const [value, weight] of entries) {
    n -= weight
    if (n <= 0) return value
  }
  return entries[entries.length - 1]![0]
}

async function main() {
  const catalogueIds = new Set(CATALOGUE.map((c) => c.id))
  for (const [id] of ACTION_WEIGHTS) {
    if (!catalogueIds.has(id)) throw new Error(`action not in catalogue: ${id}`)
  }

  const privateBytes = Uint8Array.from(Buffer.from(await sha256Hex(SEED), 'hex'))
  const privateKeyPem = pem('ED25519 PRIVATE KEY', privateBytes)
  const { publicKeyPem, fingerprint } = await publicKeyFromPrivate(privateKeyPem)

  const random = prng(0x5eed_1e55)
  const log = createLog({ formatVersion: FORMAT_VERSION })

  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!
  const actor = () => {
    const total = ACTORS.reduce((s, a) => s + a.weight, 0)
    let n = random() * total
    for (const a of ACTORS) {
      n -= a.weight
      if (n <= 0) return { id: a.id, role: a.role }
    }
    return { id: ACTORS[0]!.id, role: ACTORS[0]!.role }
  }

  for (let i = 0; i < EVENT_COUNT; i += 1) {
    const seq = i + 1
    const at = new Date(BASE + i * STEP_MS).toISOString()

    const draft: AppendDraft = {
      at,
      actor: actor(),
      action: weightedPick(random, ACTION_WEIGHTS),
      subject: pick(SUBJECTS),
      outcome: 'committed',
      lawful: 'none',
      detail: { region: pick(['eu-west-1', 'eu-central-1', 'on-prem']), requestId: `req-${seq}` },
    }

    // ── Injected story beats, at fixed positions so tests and the demo agree ──
    if (seq === 144) {
      draft.lawful = 'erasure'
      draft.actor = { id: 'dpo@northgate.example', role: 'data-protection' }
      draft.action = 'governance.policy.update'
      draft.detail = { authority: 'dpo@northgate.example', request: 'DSAR-2026-0412', fields: 'prompt,output' }
    }
    if (seq === 288) {
      draft.lawful = 'retention'
      draft.actor = { id: 'retention-scheduler', role: 'system' }
      draft.action = 'governance.policy.update'
      draft.detail = { authority: 'policy:retention-90d', checkpoint: '2026-Q4', replacedBefore: '2026-08-01' }
    }
    if (seq === 401) {
      draft.lawful = 'payload-stripped'
      draft.actor = { id: 'ravi.menon', role: 'security-lead' }
      draft.action = 'governance.policy.update'
      draft.detail = { authority: 'ravi.menon', reason: 'regulatory-redaction', fields: 'attachment' }
    }
    if (seq === 300) {
      draft.actor = { id: 'ravi.menon', role: 'security-lead' }
      draft.action = 'governance.policy.update'
      draft.detail = { change: 'signing-key-rotation', from: 'key-2026-03', to: 'key-2026-11' }
    }
    if (seq === 212 || seq === 213) {
      draft.outcome = 'refused'
      draft.detail = { reason: 'audit-unavailable', attempted: draft.action }
    }
    if (seq === 214) {
      draft.outcome = 'queued'
      draft.detail = { reason: 'audit-store-recovering', queued: 'durable-outbox' }
    }

    await log.append(draft)
  }

  const events = [...log.events()]
  const seals: Seal[] = await createSeals(events, privateKeyPem, publicKeyPem, {
    every: 60,
    at: (event) => event.at,
  })

  const anchors: Anchor[] = []
  for (const seal of seals) {
    if (seal.seq % 120 === 0) anchors.push(await createAnchor(seal))
  }

  const bundle = {
    formatVersion: FORMAT_VERSION,
    generatedAt: new Date(BASE).toISOString(),
    seed: SEED,
    publicKeyPem,
    keyFingerprint: fingerprint,
    events,
    seals,
    anchors,
  }

  const here = dirname(fileURLToPath(import.meta.url))
  const out = join(here, '..', 'packages', 'core', 'data', 'bundle.json')
  await mkdir(dirname(out), { recursive: true })
  await writeFile(out, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8')

  console.log(`wrote ${out}`)
  console.log(`events=${events.length} seals=${seals.length} anchors=${anchors.length}`)
  console.log(`key fingerprint=${fingerprint}`)
}

await main()
