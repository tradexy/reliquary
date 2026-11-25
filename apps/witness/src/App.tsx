import { useCallback, useMemo, useRef, useState } from 'react'
import { createLog, verifyChain } from '@anchora/core/chain'
import type { AppendDraft, VerificationResult } from '@anchora/core/chain'
import { CATALOGUE, createCapture } from '@anchora/core/capture'
import type { CoverageRow, PerformResult } from '@anchora/core/capture'
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
import { WitnessIntro } from './Intro.js'

type Screen = 'start' | 'coverage' | 'drill' | 'lawful' | 'evidence'

const SCREENS: readonly { id: Screen; label: string }[] = [
  { id: 'start', label: 'Start here' },
  { id: 'coverage', label: 'Coverage' },
  { id: 'drill', label: 'Drill' },
  { id: 'lawful', label: 'Lawful changes' },
  { id: 'evidence', label: 'Evidence' },
]

const ACTOR = { id: 'jose.singh', role: 'security-lead' }

function screenFromHash(): Screen {
  const id = window.location.hash.replace(/^#/, '').split('?')[0] ?? ''
  return SCREENS.find((s) => s.id === id)?.id ?? 'start'
}

// -- Coverage ----------------------------------------------------------------

function CoverageScreen({
  simulateGap,
  setSimulateGap,
}: {
  simulateGap: boolean
  setSimulateGap: (v: boolean) => void
}) {
  const baseRows = useMemo(() => loadCoverage(), [])

  const rows: CoverageRow[] = useMemo(() => {
    if (!simulateGap) return baseRows
    return [
      ...baseRows,
      {
        id: 'roles.escalate',
        area: 'roles',
        failMode: 'fail-closed',
        testRef: 'capture/catalogue.test.ts#roles.escalate',
        tested: false,
        gap: 'missing test ref in capture/catalogue.test.ts',
      },
    ]
  }, [baseRows, simulateGap])

  const closed = rows.filter((r) => r.failMode === 'fail-closed').length
  const queued = rows.length - closed
  const gaps = rows.filter((r) => !r.tested)

  return (
    <>
      <Panel
        title="Coverage matrix"
        actions={
          <button type="button" className="ax-btn" onClick={() => setSimulateGap(!simulateGap)}>
            {simulateGap ? 'Clear simulated gap' : 'Simulate untested action'}
          </button>
        }
      >
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
        <div className="ax-tall-table">
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
                    <Td mono><span className="ax-nowrap">{r.id}</span></Td>
                    <Td>{r.area}</Td>
                    <Td><span className="ax-nowrap">{r.failMode === 'fail-closed' ? 'stops' : 'queues'}</span></Td>
                    <Td>{entry?.description ?? 'Simulated unverified route (missing testRef)'}</Td>
                    <Td>
                      {r.tested ? <Badge variant="ok">tested</Badge> : <Badge variant="fail">untested</Badge>}
                    </Td>
                  </Tr>
                )
              })}
            </TBody>
          </Table>
        </div>
      </Panel>
    </>
  )
}

// -- Drill -------------------------------------------------------------------

interface DrillFeedItem {
  id: number
  action: string
  subject: string
  status: 'committed' | 'refused' | 'queued' | 'flushed'
  note: string
}

interface DrillProps {
  perform: (action: string, subject: string) => Promise<void>
  flush: () => Promise<void>
  available: boolean
  setAvailable: (v: boolean) => void
  outcome: string | null
  flushNote: string | null
  lastSeq: number | null
  counts: { refused: number; queued: number; applied: number; outbox: number }
  feed: readonly DrillFeedItem[]
  outboxItems: readonly AppendDraft[]
}

function DrillScreen(p: DrillProps) {
  return (
    <>
      <Panel title="Outage drill" actions={<Badge variant="simulated">simulated outage</Badge>}>
        <div className="ax-alert-banner" data-outage={!p.available ? 'true' : undefined}>
          <div>
            <strong>{p.available ? 'Audit store online' : 'Simulated outage active'}</strong>
            <p className="ax-empty" style={{ marginTop: 2 }}>
              {p.available
                ? 'Widening and tightening actions commit atomically to the chain.'
                : 'Widening actions refuse (audit-unavailable). Tightening actions complete and queue durably.'}
            </p>
          </div>
          <label className="ax-row" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              role="switch"
              checked={p.available}
              onChange={(e) => p.setAvailable(e.target.checked)}
            />{' '}
            <span>Audit store available</span>
          </label>
        </div>

        <div className="ax-row" style={{ marginBottom: 14 }}>
          <button type="button" className="ax-btn" onClick={() => void p.perform('roles.grant', 'role:auditor')}>
            Grant a role
          </button>
          <button
            type="button"
            className="ax-btn"
            onClick={() => void p.perform('agents.guardrail.ceiling.raise', 'commercial-loan-agent')}
          >
            Raise guardrail ceiling
          </button>
          <button type="button" className="ax-btn" onClick={() => void p.perform('roles.revoke', 'role:auditor')}>
            Revoke a role
          </button>
          <button
            type="button"
            className="ax-btn"
            onClick={() => void p.perform('agents.disable', 'commercial-loan-agent')}
          >
            Disable agent
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

        <div className="ax-row" style={{ gap: 32, marginBottom: 14 }}>
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

      <div className="ax-grid">
        <Panel title="Drill activity log">
          {p.feed.length === 0 ? (
            <p className="ax-empty">Toggle the audit store switch or trigger an action above to observe fail-closed vs queue behaviour.</p>
          ) : (
            <ul className="ax-feed" data-testid="drill-feed">
              {p.feed.map((item) => (
                <li key={item.id} className="ax-feed-item">
                  <div>
                    <span className="ax-mono">{item.action}</span>{' '}
                    <span style={{ color: 'var(--color-muted)' }}>({item.subject})</span>
                    <div style={{ color: 'var(--color-muted)', fontSize: 12 }}>{item.note}</div>
                  </div>
                  <Badge
                    variant={
                      item.status === 'refused'
                        ? 'fail'
                        : item.status === 'queued'
                          ? 'warn'
                          : 'ok'
                    }
                  >
                    {item.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={`Durable outbox (${p.outboxItems.length})`}>
          {p.outboxItems.length === 0 ? (
            <p className="ax-empty">Outbox is empty. Tightening actions performed during an outage queue here until flushed.</p>
          ) : (
            <ul className="ax-feed">
              {p.outboxItems.map((draft, idx) => (
                <li key={`${draft.action}-${idx}`} className="ax-feed-item">
                  <div>
                    <span className="ax-mono">{draft.action}</span>
                    <div style={{ color: 'var(--color-muted)', fontSize: 12 }}>{draft.subject}</div>
                  </div>
                  <Badge variant="warn">pending flush</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
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
  const [selected, setSelected] = useState<string | null>(() => {
    const first = controls[0]
    return first ? `${first.standard}|${first.control}` : null
  })
  const [showAllSeqs, setShowAllSeqs] = useState(false)
  const [exported, setExported] = useState<EvidenceBundle | null>(null)
  const [wasDownloaded, setWasDownloaded] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [verifying, setVerifying] = useState(false)
  const standards = useMemo(() => [...new Set(controls.map((c) => c.standard))], [controls])
  const key = (c: ControlResult) => `${c.standard}|${c.control}`
  const current = controls.find((c) => key(c) === selected) ?? null

  const exportBundle = () => {
    const b = bundle()
    setExported(b)
    setWasDownloaded(true)
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
    if (exported === null) {
      setExported(b)
      setWasDownloaded(false)
    }
    setVerifying(true)
    // Round-trip through JSON so the check sees what a file reader would see.
    const parsed = JSON.parse(JSON.stringify(b)) as EvidenceBundle
    const r = await verifyChain(parsed, parsed.publicKeyPem, ORIGINAL.keyFingerprint)
    setResult(r)
    setVerifying(false)
  }

  const visibleSeqs =
    current === null
      ? []
      : showAllSeqs
        ? current.eventSeqs
        : current.eventSeqs.slice(0, 24)

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
                    onClick={() => {
                      setSelected(key(c))
                      setShowAllSeqs(false)
                    }}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <span>{c.control}</span>
                    <span className="ax-mono" style={{ fontSize: 11.5, color: 'var(--color-muted)' }}>
                      {c.eventSeqs.length}
                    </span>
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
              <span className="ax-visually-hidden" data-testid="event-seqs">
                {current.eventSeqs.join(', ')}
              </span>
              <div className="ax-seq-chips" aria-label="Supporting event links">
                {visibleSeqs.map((seq) => (
                  <a key={seq} className="ax-seq-chip" href={`../seal/#chain?seq=${seq}`}>
                    seq {seq}
                  </a>
                ))}
                {current.eventSeqs.length > 24 && !showAllSeqs ? (
                  <button type="button" className="ax-pill" onClick={() => setShowAllSeqs(true)}>
                    +{current.eventSeqs.length - 24} more
                  </button>
                ) : null}
              </div>
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
          <p className="ax-empty" style={{ marginBottom: 8 }}>
            Download the JSON bundle to verify offline in Seal or via the CLI.
          </p>
          {exported !== null ? (
            <p className="ax-empty" style={{ marginBottom: 8 }}>
              {wasDownloaded
                ? `Exported ${summary(exported).events} events with ${exported.controls.length} controls.`
                : `Verified in-memory bundle (${summary(exported).events} events, ${exported.controls.length} controls).`}
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
  const feedSeqRef = useRef(0)
  const [outcome, setOutcome] = useState<string | null>(null)
  const [flushNote, setFlushNote] = useState<string | null>(null)
  const [lastSeq, setLastSeq] = useState<number | null>(null)
  const [feed, setFeed] = useState<DrillFeedItem[]>([])
  const [simulateGap, setSimulateGap] = useState(false)
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
    const id = ++feedSeqRef.current
    if (r.outcome === 'committed') {
      setLastSeq(r.event.seq)
      setOutcome(`${action}: committed. ${note}`)
      setFeed((prev) => [{ id, action, subject, status: 'committed', note: `Appended seq ${r.event.seq}` }, ...prev])
    } else if (r.outcome === 'queued') {
      setOutcome(`${action}: queued. ${note} The record waits in the outbox.`)
      setFeed((prev) => [{ id, action, subject, status: 'queued', note: 'Applied and queued durably' }, ...prev])
    } else {
      setOutcome(`${action}: refused (${r.reason}). The change was not applied.`)
      setFeed((prev) => [{ id, action, subject, status: 'refused', note: `Stopped (${r.reason})` }, ...prev])
    }
    setVersion((v) => v + 1)
  }, [])

  const flush = useCallback(async () => {
    const before = log.current.events().length
    const r = await capture.current.flush()
    const note = `Flushed ${r.flushed} queued event${r.flushed === 1 ? '' : 's'}; ${r.remaining} remaining.`
    setFlushNote(note)
    setOutcome('Outbox flushed to the audit chain.')
    const head = log.current.head()
    if (r.flushed > 0 && head !== null && log.current.events().length > before) setLastSeq(head.seq)
    const id = ++feedSeqRef.current
    setFeed((prev) => [{ id, action: 'outbox.flush', subject: 'durable-outbox', status: 'flushed', note }, ...prev])
    setVersion((v) => v + 1)
  }, [])

  void version
  const c = capture.current.counters()
  const outboxItems = capture.current.outbox()
  const counts = {
    refused: c.refusedCount,
    queued: c.queuedCount,
    applied: appliedRef.current,
    outbox: outboxItems.length,
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

  const headerStatus = !available ? (
    <Badge variant="fail">outage active · {counts.outbox} queued</Badge>
  ) : simulateGap ? (
    <Badge variant="fail">{CATALOGUE.length + 1} actions · 1 gap</Badge>
  ) : (
    <Badge variant="ok">{CATALOGUE.length} actions · 0 gaps</Badge>
  )

  return (
    <AppShell
      theme={witnessTheme}
      activeApp="witness"
      status={headerStatus}
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
      {screen === 'start' ? <WitnessIntro onOpen={() => go('coverage')} /> : null}
      {screen === 'coverage' ? (
        <CoverageScreen simulateGap={simulateGap} setSimulateGap={setSimulateGap} />
      ) : null}
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
          feed={feed}
          outboxItems={outboxItems}
        />
      ) : null}
      {screen === 'lawful' ? <LawfulScreen /> : null}
      {screen === 'evidence' ? <EvidenceScreen controls={controls} bundle={makeBundle} /> : null}
    </AppShell>
  )
}
