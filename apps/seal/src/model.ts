/**
 * Seal's data model: the committed bundles, in-memory tamper operations,
 * defensive bundle upload parser and UI derivations. No signing happens here,
 * and hashing only goes through @anchora/core. Every verdict comes from verifyChain.
 */

import bundleJson from '@anchora/core/data/bundle.json'
import kiroAuditJson from '@anchora/core/data/kiro-audit.bundle.json'
import { GENESIS_PREV_HASH, eventPreimage } from '@anchora/core/chain'
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

/** The committed Northgate Bank bundle, deeply frozen. */
export const ORIGINAL: DemoBundle = deepFreeze(bundleJson as unknown as DemoBundle)

/** Anchora's own Kiroween 2026 Kiro build audit trail, deeply frozen. */
export const KIRO_AUDIT_BUNDLE: DemoBundle = deepFreeze(kiroAuditJson as unknown as DemoBundle)

export const STORY_BEATS: readonly { seq: number; label: string }[] = [
  { seq: 144, label: '#144 Erasure' },
  { seq: 212, label: '#212 Refusal' },
  { seq: 214, label: '#214 Queued' },
  { seq: 217, label: '#217 £2M Loan' },
  { seq: 288, label: '#288 Retention' },
  { seq: 300, label: '#300 Key Rotation' },
  { seq: 401, label: '#401 Redaction' },
]

/** A plain, mutable copy of the evidence for the tamper simulator. */
export function cloneEvidence(source: Evidence): Evidence {
  return JSON.parse(
    JSON.stringify({ events: source.events, seals: source.seals, anchors: source.anchors }),
  ) as Evidence
}

function mutateEventInPlace(ev: AuditEvent): void {
  if (ev.detail && (ev.detail['decision'] === 'approved' || ev.detail['decision'] === 'declined')) {
    ev.detail = { ...ev.detail, decision: 'declined' }
    return
  }
  if (!ev.subject.endsWith(' (edited)')) {
    ev.subject = `${ev.subject} (edited)`
  }
}

// -- Tamper operations (always on a copy) ------------------------------------

export function editRecord(source: Evidence, index: number): Evidence {
  const copy = cloneEvidence(source)
  const ev = copy.events[index]
  if (ev === undefined) return copy
  mutateEventInPlace(ev)
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

/**
 * Simulate an attacker with database access who edits `index` AND recomputes
 * every subsequent prevHash and hash down to the end of the log. Every chain
 * link looks valid — until verification checks the externally signed seals
 * and create-only anchors.
 */
export async function rewriteChainFrom(source: Evidence, index: number): Promise<Evidence> {
  const copy = cloneEvidence(source)
  const target = copy.events[index]
  if (target === undefined) return copy
  mutateEventInPlace(target)
  for (let i = index; i < copy.events.length; i += 1) {
    const ev = copy.events[i]!
    const prevHash = i === 0 ? GENESIS_PREV_HASH : copy.events[i - 1]!.hash
    const nextWithoutHash: Omit<AuditEvent, 'hash'> = {
      seq: ev.seq,
      at: ev.at,
      actor: ev.actor,
      action: ev.action,
      subject: ev.subject,
      outcome: ev.outcome,
      lawful: ev.lawful,
      detail: ev.detail,
      prevHash,
    }
    const hash = await sha256Hex(eventPreimage(nextWithoutHash))
    copy.events[i] = { ...nextWithoutHash, hash }
  }
  return copy
}

// -- Defensive bundle parser (no untrusted spread) ---------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseUploadedBundle(
  rawText: string,
): { ok: true; bundle: DemoBundle } | { ok: false; error: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    return { ok: false, error: 'File is not valid JSON.' }
  }
  if (!isRecord(parsed)) return { ok: false, error: 'Bundle root must be a JSON object.' }
  const formatVersion = parsed['formatVersion']
  const publicKeyPem = parsed['publicKeyPem']
  const keyFingerprint = parsed['keyFingerprint']
  const eventsRaw = parsed['events']
  const sealsRaw = parsed['seals']
  const anchorsRaw = parsed['anchors']

  if (typeof formatVersion !== 'string' || typeof publicKeyPem !== 'string') {
    return { ok: false, error: 'Bundle must include formatVersion and publicKeyPem strings.' }
  }
  if (!Array.isArray(eventsRaw)) {
    return { ok: false, error: 'Bundle must include an events array.' }
  }

  const events: AuditEvent[] = []
  for (const item of eventsRaw) {
    if (!isRecord(item) || typeof item['seq'] !== 'number' || typeof item['hash'] !== 'string') {
      return { ok: false, error: 'Each event must be an object with numeric seq and string hash.' }
    }
    const actorRaw = item['actor']
    const detailRaw = item['detail']
    const actor = isRecord(actorRaw)
      ? {
          id: typeof actorRaw['id'] === 'string' ? actorRaw['id'] : 'unknown',
          role: typeof actorRaw['role'] === 'string' ? actorRaw['role'] : 'unknown',
        }
      : { id: 'unknown', role: 'unknown' }
    const detail: Record<string, string | number | boolean | null> = {}
    if (isRecord(detailRaw)) {
      for (const [k, v] of Object.entries(detailRaw)) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' || v === null) {
          detail[k] = v
        }
      }
    }
    events.push({
      seq: item['seq'],
      at: typeof item['at'] === 'string' ? item['at'] : '',
      actor,
      action: typeof item['action'] === 'string' ? item['action'] : '',
      subject: typeof item['subject'] === 'string' ? item['subject'] : '',
      outcome:
        item['outcome'] === 'refused' || item['outcome'] === 'queued' ? item['outcome'] : 'committed',
      lawful:
        item['lawful'] === 'erasure' ||
        item['lawful'] === 'retention' ||
        item['lawful'] === 'payload-stripped'
          ? item['lawful']
          : 'none',
      detail,
      prevHash: typeof item['prevHash'] === 'string' ? item['prevHash'] : '',
      hash: item['hash'],
    })
  }

  const seals: Seal[] = Array.isArray(sealsRaw)
    ? sealsRaw.filter(isRecord).map((s) => ({
        seq: typeof s['seq'] === 'number' ? s['seq'] : 0,
        hash: typeof s['hash'] === 'string' ? s['hash'] : '',
        at: typeof s['at'] === 'string' ? s['at'] : '',
        keyId: typeof s['keyId'] === 'string' ? s['keyId'] : '',
        signature: typeof s['signature'] === 'string' ? s['signature'] : '',
      }))
    : []

  const anchors: Anchor[] = Array.isArray(anchorsRaw)
    ? anchorsRaw.filter(isRecord).map((a) => ({
        seq: typeof a['seq'] === 'number' ? a['seq'] : 0,
        headHash: typeof a['headHash'] === 'string' ? a['headHash'] : '',
        sealSignature: typeof a['sealSignature'] === 'string' ? a['sealSignature'] : '',
        anchorDigest: typeof a['anchorDigest'] === 'string' ? a['anchorDigest'] : '',
        at: typeof a['at'] === 'string' ? a['at'] : '',
      }))
    : []

  return {
    ok: true,
    bundle: deepFreeze({
      formatVersion,
      generatedAt:
        typeof parsed['generatedAt'] === 'string'
          ? parsed['generatedAt']
          : typeof parsed['exportedAt'] === 'string'
            ? parsed['exportedAt']
            : '',
      publicKeyPem,
      keyFingerprint: typeof keyFingerprint === 'string' ? keyFingerprint : '(unspecified)',
      events,
      seals,
      anchors,
    }),
  }
}

// -- Derivations --------------------------------------------------------------

export type RowState = 'ok' | 'lawful' | 'divergent'

export interface FieldDiff {
  field: string
  before: string
  after: string
}

export function diffEvent(original: AuditEvent | undefined, current: AuditEvent | null): FieldDiff[] {
  if (!original || !current) return []
  const diffs: FieldDiff[] = []
  if (original.subject !== current.subject) {
    diffs.push({ field: 'subject', before: original.subject, after: current.subject })
  }
  const keys = new Set([...Object.keys(original.detail), ...Object.keys(current.detail)])
  for (const k of keys) {
    const a = original.detail[k]
    const b = current.detail[k]
    if (a !== b) {
      diffs.push({ field: `detail.${k}`, before: String(a), after: String(b) })
    }
  }
  return diffs
}

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
  const hay = `${ev.seq} ${ev.at} ${ev.action} ${ev.actor.id} ${ev.subject} ${ev.outcome} ${JSON.stringify(ev.detail)}`.toLowerCase()
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
      detail: `${lawful} lawful ${lawful === 1 ? 'change' : 'changes'} recorded and classified.`,
    },
  ]
}
