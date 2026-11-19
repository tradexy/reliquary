import { useCallback, useMemo, useRef, useState } from 'react'
import { createLog, verifyChain } from '@anchora/core/chain'
import type { VerificationResult } from '@anchora/core/chain'
import { CATALOGUE, createCapture } from '@anchora/core/capture'
import type { PerformResult } from '@anchora/core/capture'
import { buildBundle, evaluateControls, summary } from '@anchora/core/evidence'
import type { ControlResult, EvidenceBundle } from '@anchora/core/evidence'
import {
  AppShell,
  Badge,
  KeyValue,
  Panel,
  Stat,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  witnessTheme,
} from '@anchora/core/ui'
import { ORIGINAL, loadCoverage, lawfulRows } from './model.js'

type Screen = 'coverage' | 'drill' | 'lawful' | 'evidence'

const SCREENS: readonly { id: Screen; label: string }[] = [
  { id: 'coverage', label: 'Coverage' },
  { id: 'drill', label: 'Drill' },
  { id: 'lawful', label: 'Lawful changes' },
  { id: 'evidence', label: 'Evidence' },
]

const ACTOR = { id: 'ravi.menon', role: 'security-lead' }

function screenFromHash(): Screen {
  const id = window.location.hash.replace(/^#/, '')
  return SCREENS.find((s) => s.id === id)?.id ?? 'coverage'
}

// -- Coverage ----------------------------------------------------------------

function CoverageScreen() {
  const rows = useMemo(() => loadCoverage(), [])
  const closed = rows.filter((r) => r.failMode === 'fail-closed').length
  const queued = rows.length - closed
  const gaps = rows.filter((r) => !r.tested)
  return (
    <>
      <Panel title="Coverage matrix">
        <div className="ax-row" style={{ gap: 32 }}>
          <div data-testid="total-actions"><Stat label="Actions" value={rows.length} /></div>
          <div data-testid="fail-closed-count"><Stat label="Fail-closed" value={closed} /></div>
          <div data-testid="queued-count"><Stat label="Queued" value={queued} /></div>
          <div data-testid="gap-count"><Stat label="Gaps" value={gaps.length} /></div>
        </div>
      </Panel>
      {gaps.length > 0 ? (
        <div role="alert" style={{ border: '1px solid var(--color-danger)', padding: 12, marginBottom: 16 }}>
          <strong style={{ color: 'var(--color-danger)' }}>
            {gaps.length} catalogued action{gaps.length === 1 ? '' : 's'} without a test.
          </strong>
          <p style={{ margin: '4px 0 0' }}>
            The build guard would fail: an action that can be performed but is not proven to be
            recorded is a hole in the audit trail.
          </p>
          <ul>
            {gaps.map((g) => (
              <li key={g.id}>
                <span className="ax-mono">{g.id}</span>: {g.gap}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Panel title="Catalogue">
        <Table caption="Auditable actions" hideCaption>
          <THead>
            <Th>Action</Th>
            <Th>Area</Th>
            <Th>Fail mode</Th>
            <Th>Description</Th>
            <Th>Tested</Th>
          </THead>
          <TBody>
            {rows.map((r) => {
              const entry = CATALOGUE.find((c) => c.id === r.id)
              return (
                <Tr key={r.id} data={{ 'data-action': r.id }}>
                  <Td mono>{r.id}</Td>
                  <Td>{r.area}</Td>
                  <Td>{r.failMode === 'fail-closed' ? 'stops' : 'queues'}</Td>
                  <Td>{entry?.description ?? ''}</Td>
                  <Td>
                    {r.tested ? <Badge variant="ok">tested</Badge> : <Badge variant="fail">untested</Badge>}
                  </Td>
                </Tr>
              )
            })}
          </TBody>
        </Table>
      </Panel>
    </>
  )
}

// -- Drill -------------------------------------------------------------------

interface DrillProps {
  perform: (action: string, subject: string) => Promise<void>
  flush: () => Promise<void>
  available: boolean
  setAvailable: (v: boolean) => void
  outcome: string | null
  flushNote: string | null
  lastSeq: number | null
  counts: { refused: number; queued: number; applied: number; outbox: number }
}

function DrillScreen(p: DrillProps) {
  return (
    <Panel title="Outage drill" actions={<Badge variant="simulated">simulated outage</Badge>}>
      <p className="ax-empty" style={{ marginBottom: 12 }}>
        Widening actions stop when the audit store is down. Tightening actions go ahead and queue
        their record. The outage is a switch in this page, not a real storage fault.
      </p>
      <div className="ax-row" style={{ marginBottom: 12 }}>
        <label>
          <input
            type="checkbox"
            role="switch"
            checked={p.available}
            onChange={(e) => p.setAvailable(e.target.checked)}
          />{' '}
          Audit store available
        </label>
      </div>
      <div className="ax-row" style={{ marginBottom: 12 }}>
        <button type="button" className="ax-btn" onClick={() => void p.perform('roles.grant', 'role:auditor')}>
          Grant a role
        </button>
        <button type="button" className="ax-btn" onClick={() => void p.perform('roles.revoke', 'role:auditor')}>
          Revoke a role
        </button>
        <button
          type="button"
          className="ax-btn ax-btn--primary"
          disabled={p.counts.outbox === 0}
          onClick={() => void p.flush()}
        >
          Flush outbox
        </button>
      </div>
      <div className="ax-row" style={{ gap: 32, marginBottom: 12 }}>
        <div data-testid="counter-refused"><Stat label="Refused" value={p.counts.refused} /></div>
        <div data-testid="counter-queued"><Stat label="Queued" value={p.counts.queued} /></div>
        <div data-testid="counter-applied"><Stat label="Applied" value={p.counts.applied} /></div>
        <div data-testid="counter-outbox"><Stat label="In outbox" value={p.counts.outbox} /></div>
      </div>
      <p aria-live="polite" data-testid="outcome" style={{ margin: '0 0 6px' }}>
        {p.outcome ?? 'No action performed yet.'}
      </p>
      {p.flushNote !== null ? (
        <p aria-live="polite" data-testid="flush-note" style={{ margin: '0 0 6px' }}>{p.flushNote}</p>
      ) : null}
      {p.lastSeq !== null ? (
        <p data-testid="last-seq" style={{ margin: 0 }}>
          Appended seq <span className="ax-mono">{p.lastSeq}</span>
        </p>
      ) : null}
    </Panel>
  )
}

// -- Lawful ------------------------------------------------------------------

function LawfulScreen() {
  const rows = useMemo(() => lawfulRows(ORIGINAL.events), [])
  return (
    <Panel title="Lawful changes">
      <p style={{ marginTop: 0 }}>
        These are the changes a verifier reports as lawful rather than tampering.
      </p>
      <Table caption="Lawful changes" hideCaption>
        <THead>
          <Th>Seq</Th>
          <Th>Kind</Th>
          <Th>Authority</Th>
          <Th>Detail</Th>
        </THead>
        <TBody>
          {rows.map((r) => (
            <Tr key={r.seq} data={{ 'data-seq': String(r.seq) }}>
              <Td mono>{r.seq}</Td>
              <Td>{r.kind}</Td>
              <Td mono>{r.authority}</Td>
              <Td>{r.detail}</Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </Panel>
  )
}

// -- Evidence ----------------------------------------------------------------

interface EvidenceProps {
  controls: ControlResult[]
  bundle: () => EvidenceBundle
}

function EvidenceScreen({ controls, bundle }: EvidenceProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [exported, setExported] = useState<EvidenceBundle | null>(null)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [verifying, setVerifying] = useState(false)
  const standards = useMemo(() => [...new Set(controls.map((c) => c.standard))], [controls])
  const key = (c: ControlResult) => `${c.standard}|${c.control}`
  const current = controls.find((c) => key(c) === selected) ?? null

  const exportBundle = () => {
    const b = bundle()
    setExported(b)
    setResult(null)
    const blob = new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'anchora-evidence.bundle.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const verifyExport = async () => {
    const b = exported ?? bundle()
    if (exported === null) setExported(b)
    setVerifying(true)
    // Round-trip through JSON so the check sees what a file reader would see.
    const parsed = JSON.parse(JSON.stringify(b)) as EvidenceBundle
    const r = await verifyChain(parsed, parsed.publicKeyPem, ORIGINAL.keyFingerprint)
    setResult(r)
    setVerifying(false)
  }

  return (
    <div className="ax-grid">
      <Panel title="Controls">
        {standards.map((s) => (
          <section key={s} aria-label={s} style={{ marginBottom: 12 }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 14 }}>{s}</h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
              {controls.filter((c) => c.standard === s).map((c) => (
                <li key={key(c)}>
                  <button
                    type="button"
                    className={`ax-btn${key(c) === selected ? ' ax-btn--primary' : ''}`}
                    aria-pressed={key(c) === selected}
                    onClick={() => setSelected(key(c))}
                    style={{ width: '100%', textAlign: 'left' }}
                  >
                    {c.control}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Panel>
      <div>
        <Panel title="Control detail">
          {current === null ? (
            <p className="ax-empty">Select a control to see the records that support it.</p>
          ) : (
            <div data-testid="control-detail">
              <p style={{ marginTop: 0 }}>{current.statement}</p>
              <div className="ax-row" style={{ marginBottom: 8 }}>
                {current.complete ? (
                  <Badge variant="ok">complete</Badge>
                ) : (
                  <Badge variant="warn">partial</Badge>
                )}
                <span>
                  Events: <span className="ax-mono" data-testid="event-count">{current.eventSeqs.length}</span>
                </span>
              </div>
              <pre className="ax-pre" data-testid="event-seqs">{current.eventSeqs.join(', ')}</pre>
            </div>
          )}
        </Panel>
        <Panel title="Export">
          <div className="ax-row" style={{ marginBottom: 10 }}>
            <button type="button" className="ax-btn ax-btn--primary" onClick={exportBundle}>
              Export evidence bundle
            </button>
            <button type="button" className="ax-btn" disabled={verifying} onClick={() => void verifyExport()}>
              Verify this export
            </button>
          </div>
          {exported !== null ? (
            <p className="ax-empty" style={{ marginBottom: 8 }}>
              Exported {summary(exported).events} events with {exported.controls.length} controls.
              Check it offline with <span className="ax-mono">npm run verify:bundle</span>.
            </p>
          ) : null}
          {result !== null && exported !== null ? (
            <div data-testid="verify-result">
              {result.ok ? <Badge variant="ok">PASS</Badge> : <Badge variant="fail">FAIL</Badge>}
              <KeyValue
                items={[
                  { label: 'Events', value: result.counts.events, mono: true },
                  { label: 'Seals', value: result.counts.seals, mono: true },
                  { label: 'Anchors', value: result.counts.anchors, mono: true },
                  { label: 'Key fingerprint', value: exported.keyFingerprint, mono: true },
                ]}
              />
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  )
}

// -- App ---------------------------------------------------------------------

export function App() {
  const [screen, setScreen] = useState<Screen>(screenFromHash)
  const [available, setAvailable] = useState(true)
  const availableRef = useRef(true)
  const appliedRef = useRef(0)
  const [outcome, setOutcome] = useState<string | null>(null)
  const [flushNote, setFlushNote] = useState<string | null>(null)
  const [lastSeq, setLastSeq] = useState<number | null>(null)
  const [version, setVersion] = useState(0)

  // One log and one capture for the life of the page, seeded with the bundle.
  const log = useRef(createLog({ formatVersion: ORIGINAL.formatVersion, events: ORIGINAL.events }))
  const capture = useRef(
    createCapture({
      log: { append: (d) => log.current.append(d) },
      catalogue: CATALOGUE,
      brokenStore: () => !availableRef.current,
      now: () => new Date().toISOString(),
    }),
  )

  const go = (s: Screen) => {
    window.location.hash = s
    setScreen(s)
  }

  const setStore = (v: boolean) => {
    availableRef.current = v
    setAvailable(v)
  }

  const perform = useCallback(async (action: string, subject: string) => {
    let note = ''
    const r: PerformResult = await capture.current.perform(
      action,
      subject,
      ACTOR,
      { principal: 'drill' },
      () => {
        appliedRef.current += 1
        note = `The change was applied (${action} on ${subject}).`
      },
    )
    if (r.outcome === 'committed') {
      setLastSeq(r.event.seq)
      setOutcome(`${action}: committed. ${note}`)
    } else if (r.outcome === 'queued') {
      setOutcome(`${action}: queued. ${note} The record waits in the outbox.`)
    } else {
      setOutcome(`${action}: refused (${r.reason}). The change was not applied.`)
    }
    setVersion((v) => v + 1)
  }, [])

  const flush = useCallback(async () => {
    const before = log.current.events().length
    const r = await capture.current.flush()
    setFlushNote(`Flushed ${r.flushed} queued event${r.flushed === 1 ? '' : 's'}; ${r.remaining} remaining.`)
    const head = log.current.head()
    if (r.flushed > 0 && head !== null && log.current.events().length > before) setLastSeq(head.seq)
    setVersion((v) => v + 1)
  }, [])

  void version
  const c = capture.current.counters()
  const counts = {
    refused: c.refusedCount,
    queued: c.queuedCount,
    applied: appliedRef.current,
    outbox: capture.current.outbox().length,
  }

  const events = log.current.events()
  const controls = evaluateControls(events)
  const makeBundle = () =>
    buildBundle({
      events: log.current.events(),
      seals: ORIGINAL.seals,
      anchors: ORIGINAL.anchors,
      publicKeyPem: ORIGINAL.publicKeyPem,
      keyFingerprint: ORIGINAL.keyFingerprint,
      controls: evaluateControls(log.current.events()),
      exportedAt: new Date().toISOString(),
    })

  return (
    <AppShell
      theme={witnessTheme}
      title="Witness"
      subtitle="Proves nothing was missed. Every catalogued action is recorded, or it does not happen."
      nav={
        <div role="tablist" aria-label="Screens" className="ax-row">
          {SCREENS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={screen === s.id}
              className={`ax-btn${screen === s.id ? ' ax-btn--primary' : ''}`}
              onClick={() => go(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      }
      footer={{
        keyFingerprint: ORIGINAL.keyFingerprint,
        events: events.length,
        rejections: counts.refused,
      }}
    >
      {screen === 'coverage' ? <CoverageScreen /> : null}
      {screen === 'drill' ? (
        <DrillScreen
          perform={perform}
          flush={flush}
          available={available}
          setAvailable={setStore}
          outcome={outcome}
          flushNote={flushNote}
          lastSeq={lastSeq}
          counts={counts}
        />
      ) : null}
      {screen === 'lawful' ? <LawfulScreen /> : null}
      {screen === 'evidence' ? <EvidenceScreen controls={controls} bundle={makeBundle} /> : null}
    </AppShell>
  )
}
