/**
 * Seal's data model: the committed bundle, in-memory tamper operations and the
 * derivations the screens need. No signing happens here, and hashing only goes
 * through @anchora/core. Every verdict comes from verifyChain.
 */

import bundleJson from '@anchora/core/data/bundle.json'
import { eventPreimage } from '@anchora/core/chain'
import type { Anchor, AuditEvent, Finding, Seal, VerificationResult } from '@anchora/core/chain'
import { sha256Hex } from '@anchora/core/crypto'
import type { ControlStatus } from '@anchora/core/ui'

export interface Evidence {
  events: AuditEvent[]
  seals: Seal[]
  anchors: Anchor[]
}

export interface DemoBundle extends Evidence {
  formatVersion: string
  generatedAt: string
  publicKeyPem: string
  keyFingerprint: string
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value)) deepFreeze(child)
  }
  return value
}

/** The committed bundle, deeply frozen: the UI cannot mutate it by accident. */
export const ORIGINAL: DemoBundle = deepFreeze(bundleJson as unknown as DemoBundle)

/** A plain, mutable copy of the evidence for the tamper simulator. */
export function cloneEvidence(source: Evidence): Evidence {
  return JSON.parse(
    JSON.stringify({ events: source.events, seals: source.seals, anchors: source.anchors }),
  ) as Evidence
}

// -- Tamper operations (always on a copy) ------------------------------------

export function editRecord(source: Evidence, index: number): Evidence {
  const copy = cloneEvidence(source)
  const ev = copy.events[index]
  if (ev === undefined) return copy
  ev.subject = `${ev.subject} (edited)`
  return copy
}

export function deleteRecord(source: Evidence, index: number): Evidence {
  const copy = cloneEvidence(source)
  copy.events.splice(index, 1)
  return copy
}

/**
 * Insert a forged record after `index`. It is correctly hashed and linked to its
 * predecessor, so it verifies on its own; what exposes it is that the record
 * after it no longer links to it and the sequence repeats.
 */
export async function insertRecord(source: Evidence, index: number): Promise<Evidence> {
  const copy = cloneEvidence(source)
  const prev = copy.events[index]
  if (prev === undefined) return copy
  const draft: Omit<AuditEvent, 'hash'> = {
    seq: prev.seq + 1,
    at: prev.at,
    actor: { id: 'unknown', role: 'unknown' },
    action: prev.action,
    subject: 'inserted-record',
    outcome: 'committed',
    lawful: 'none',
    detail: {},
    prevHash: prev.hash,
  }
  const hash = await sha256Hex(eventPreimage(draft))
  copy.events.splice(index + 1, 0, { ...draft, hash })
  return copy
}

// -- Derivations --------------------------------------------------------------

export type RowState = 'ok' | 'lawful' | 'divergent'

export function errorSeqs(findings: readonly Finding[]): Set<number> {
  return new Set(findings.filter((f) => f.severity === 'error').map((f) => f.seq))
}

export function rowState(ev: AuditEvent, errors: ReadonlySet<number>): RowState {
  if (errors.has(ev.seq)) return 'divergent'
  return ev.lawful !== 'none' ? 'lawful' : 'ok'
}

export function areaOf(action: string): string {
  const dot = action.indexOf('.')
  return dot === -1 ? action : action.slice(0, dot)
}

export function matchesText(ev: AuditEvent, text: string): boolean {
  const needle = text.trim().toLowerCase()
  if (needle === '') return true
  const hay = `${ev.seq} ${ev.at} ${ev.action} ${ev.actor.id} ${ev.subject} ${ev.outcome}`.toLowerCase()
  return hay.includes(needle)
}

function hasError(result: VerificationResult, codes: readonly string[]): boolean {
  return result.findings.some((f) => f.severity === 'error' && codes.includes(f.code))
}

/**
 * The five controls. Until a verification has completed they are `degraded`,
 * because nothing has been checked. Verification itself is `failing` when the
 * latest run found errors.
 */
export function deriveControls(result: VerificationResult | null, running: boolean): ControlStatus[] {
  if (result === null) {
    const detail = running ? 'Verification running.' : 'Not yet verified.'
    return [
      { id: 'chain', label: 'Chain', state: 'degraded', detail },
      { id: 'signing', label: 'Signing', state: 'degraded', detail, simulated: true },
      { id: 'anchoring', label: 'Anchoring', state: 'degraded', detail, simulated: true },
      { id: 'verification', label: 'Verification', state: 'degraded', detail },
      { id: 'retention', label: 'Retention', state: 'degraded', detail },
    ]
  }
  const lawful = result.findings.filter((f) => f.code === 'LAWFUL_CHANGE').length
  const chainBad = hasError(result, ['HASH_MISMATCH', 'LINK_BROKEN', 'SEQ_GAP', 'VERSION_UNSUPPORTED'])
  const sealBad = hasError(result, ['SEAL_INVALID'])
  const anchorBad = hasError(result, ['ANCHOR_MISMATCH', 'ANCHOR_MISSING'])
  const verificationState = running ? 'degraded' : result.ok ? 'ok' : 'failing'
  return [
    {
      id: 'chain',
      label: 'Chain',
      state: chainBad ? 'failing' : 'ok',
      detail:
        chainBad && result.firstDivergence !== null
          ? `First divergence at seq ${result.firstDivergence}.`
          : `${result.counts.events} events linked.`,
    },
    {
      id: 'signing',
      label: 'Signing',
      state: sealBad ? 'failing' : 'ok',
      detail: `${result.counts.seals} seals checked. Key custody is modelled.`,
      simulated: true,
    },
    {
      id: 'anchoring',
      label: 'Anchoring',
      state: anchorBad ? 'failing' : 'ok',
      detail: `${result.counts.anchors} anchors checked. Object lock is modelled.`,
      simulated: true,
    },
    {
      id: 'verification',
      label: 'Verification',
      state: verificationState,
      detail: running ? 'Verification running.' : result.ok ? 'Last run passed.' : 'Last run found errors.',
    },
    {
      id: 'retention',
      label: 'Retention',
      state: 'ok',
      detail: `${lawful} lawful changes recorded and classified.`,
    },
  ]
}
