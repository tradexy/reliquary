import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { verifyChain, eventPreimage } from '@anchora/core/chain'
import type { AuditEvent, VerificationResult } from '@anchora/core/chain'
import { sha256Hex } from '@anchora/core/crypto'
import {
  AppShell,
  Badge,
  ControlPanel,
  FindingList,
  KeyValue,
  Panel,
  Stat,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  sealTheme,
} from '@anchora/core/ui'
import {
  ORIGINAL,
  areaOf,
  deleteRecord,
  deriveControls,
  editRecord,
  errorSeqs,
  insertRecord,
  matchesText,
  rowState,
} from './model.js'
import type { DemoBundle, Evidence } from './model.js'
import { SealIntro } from './Intro.js'

type Screen = 'start' | 'chain'

const SCREENS: readonly { id: Screen; label: string }[] = [
  { id: 'start', label: 'Start here' },
  { id: 'chain', label: 'Chain' },
]

function screenFromHash(): Screen {
  const id = window.location.hash.replace(/^#/, '')
  return SCREENS.find((s) => s.id === id)?.id ?? 'start'
}

function short(hash: string, n: number): string {
  return `${hash.slice(0, n)}…`
}

export interface AppProps {
  /** Evidence to show. Defaults to the committed demo bundle. */
  bundle?: DemoBundle
}

export function App({ bundle = ORIGINAL }: AppProps = {}) {
  // `tampered` is an in-memory copy; null means "showing the original bundle".
  const [tampered, setTampered] = useState<Evidence | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [area, setArea] = useState('all')
  const [text, setText] = useState('')
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [running, setRunning] = useState(false)
  const [screen, setScreen] = useState<Screen>(screenFromHash)
  const go = (s: Screen) => {
    window.location.hash = s
    setScreen(s)
  }

  const evidence = tampered ?? bundle
  const runId = useRef(0)

  const run = useCallback(async (target: Evidence) => {
    const id = ++runId.current
    setRunning(true)
    const r = await verifyChain(
      {
        formatVersion: bundle.formatVersion,
        events: target.events,
        seals: target.seals,
        anchors: target.anchors,
      },
      bundle.publicKeyPem,
      bundle.keyFingerprint,
    )
    // A newer run supersedes this one.
    if (id === runId.current) {
      setResult(r)
      setRunning(false)
    }
  }, [bundle])

  // Initial verification on load so the demo starts with every control `ok`.
  useEffect(() => {
    void run(bundle)
  }, [run, bundle])

  const apply = useCallback(
    (next: Evidence | null) => {
      setTampered(next)
      void run(next ?? bundle)
    },
    [run, bundle],
  )

  const errors = useMemo(() => errorSeqs(result?.findings ?? []), [result])
  const areas = useMemo(
    () => [...new Set(evidence.events.map((e) => areaOf(e.action)))].sort(),
    [evidence],
  )
  const visible = useMemo(
    () =>
      evidence.events
        .map((ev, index) => ({ ev, index }))
        .filter(({ ev }) => (area === 'all' || areaOf(ev.action) === area) && matchesText(ev, text)),
    [evidence, area, text],
  )

  const selectedEvent: AuditEvent | null = selected === null ? null : (evidence.events[selected] ?? null)

  const selectSeq = (seq: number) => {
    const index = evidence.events.findIndex((e) => e.seq === seq)
    if (index !== -1) {
      setArea('all')
      setText('')
      setSelected(index)
    }
  }

  const refused = evidence.events.filter((e) => e.outcome === 'refused').length
  const controls = deriveControls(result, running)

  return (
    <AppShell
      theme={sealTheme}
      title="Seal"
      subtitle="Proves nothing changed. Every record is hash-chained, signed and anchored, and you can recompute it."
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
        keyFingerprint: bundle.keyFingerprint,
        events: evidence.events.length,
        rejections: refused,
      }}
    >
      {screen === 'start' ? <SealIntro onOpen={() => go('chain')} /> : null}
      {screen === 'chain' ? (
      <>
      <Panel title="Controls">
        <ControlPanel controls={controls} />
      </Panel>

      <div className="ax-grid">
        <div>
          <Panel
            title="Chain"
            actions={
              tampered !== null ? (
                <Badge variant="fail">working copy modified</Badge>
              ) : (
                <Badge variant="ok">original bundle</Badge>
              )
            }
          >
            <div className="ax-row" style={{ marginBottom: 10 }}>
              <label>
                Area{' '}
                <select className="ax-input" value={area} onChange={(e) => setArea(e.target.value)}>
                  <option value="all">All areas</option>
                  {areas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Filter{' '}
                <input
                  className="ax-input"
                  type="search"
                  value={text}
                  placeholder="seq, action, actor, subject"
                  onChange={(e) => setText(e.target.value)}
                />
              </label>
              <span className="ax-mono" role="status">
                {visible.length} of {evidence.events.length} records
              </span>
            </div>
            <Table caption="Audit events" hideCaption>
              <THead>
                <Th>Seq</Th>
                <Th>Time</Th>
                <Th>Action</Th>
                <Th>Actor</Th>
                <Th>Subject</Th>
                <Th>Outcome</Th>
                <Th>Hash</Th>
                <Th>State</Th>
              </THead>
              <TBody>
                {visible.map(({ ev, index }) => {
                  const state = rowState(ev, errors)
                  return (
                    <Tr
                      key={`${index}-${ev.seq}`}
                      data={{ 'data-seq': String(ev.seq), 'data-state': state }}
                      selected={index === selected}
                      onSelect={() => setSelected(index)}
                    >
                      <Td mono>{ev.seq}</Td>
                      <Td mono>{ev.at.replace('T', ' ').slice(0, 19)}</Td>
                      <Td>{ev.action}</Td>
                      <Td>{ev.actor.id}</Td>
                      <Td>{ev.subject}</Td>
                      <Td>{ev.outcome}</Td>
                      <Td mono>{ev.hash.slice(0, 8)}</Td>
                      <Td>
                        <Badge variant={state === 'ok' ? 'ok' : state === 'lawful' ? 'warn' : 'fail'}>
                          {state}
                        </Badge>
                      </Td>
                    </Tr>
                  )
                })}
              </TBody>
            </Table>
            {visible.length === 0 ? <p className="ax-empty">No records match these filters.</p> : null}
          </Panel>

          <Panel title="Findings">
            {result === null ? (
              <p className="ax-empty">Verification has not completed.</p>
            ) : (
              <FindingList
                findings={result.findings}
                firstDivergence={result.firstDivergence}
                onSelectSeq={selectSeq}
              />
            )}
          </Panel>
        </div>

        <div>
          <RecordDetail event={selectedEvent} />

          <Panel title="Tamper simulator">
            <p className="ax-empty" style={{ marginBottom: 10 }}>
              Changes apply to an in-memory copy. The original bundle is never modified.
            </p>
            <div className="ax-row">
              <button
                type="button"
                className="ax-btn ax-btn--danger"
                disabled={selected === null}
                onClick={() => selected !== null && apply(editRecord(evidence, selected))}
              >
                Edit this record
              </button>
              <button
                type="button"
                className="ax-btn ax-btn--danger"
                disabled={selected === null}
                onClick={() => {
                  if (selected === null) return
                  apply(deleteRecord(evidence, selected))
                  setSelected(null)
                }}
              >
                Delete this record
              </button>
              <button
                type="button"
                className="ax-btn ax-btn--danger"
                disabled={selected === null}
                onClick={() => {
                  if (selected === null) return
                  void insertRecord(evidence, selected).then(apply)
                }}
              >
                Insert a record
              </button>
              <button
                type="button"
                className="ax-btn ax-btn--primary"
                disabled={tampered === null}
                onClick={() => apply(null)}
              >
                Restore
              </button>
            </div>
            {result !== null && result.firstDivergence !== null ? (
              <p role="alert" style={{ margin: '10px 0 0' }}>
                First divergence at seq <strong className="ax-mono">{result.firstDivergence}</strong>.
              </p>
            ) : null}
          </Panel>

          <SealsAnchors
            evidence={evidence}
            result={result}
            running={running}
            onVerify={() => void run(evidence)}
          />
        </div>
      </div>
      </>
      ) : null}
    </AppShell>
  )
}

function RecordDetail({ event }: { event: AuditEvent | null }) {
  const [recomputed, setRecomputed] = useState<{ preimage: string; hash: string } | null>(null)
  const preimage = event === null ? null : eventPreimage(event)

  useEffect(() => {
    if (preimage === null) {
      setRecomputed(null)
      return
    }
    let live = true
    void sha256Hex(preimage).then((hash) => {
      if (live) setRecomputed({ preimage, hash })
    })
    return () => {
      live = false
    }
  }, [preimage])

  if (event === null || preimage === null) {
    return (
      <Panel title="Record detail">
        <p className="ax-empty">Select a record to see the exact bytes that were hashed.</p>
      </Panel>
    )
  }
  const fresh = recomputed !== null && recomputed.preimage === preimage ? recomputed.hash : null
  return (
    <Panel title={`Record detail: seq ${event.seq}`}>
      <p className="ax-empty" style={{ marginBottom: 6 }}>
        Canonical preimage. The SHA-256 of these bytes is the hash.
      </p>
      <pre className="ax-pre" tabIndex={0} aria-label="Canonical preimage" data-testid="preimage">
        {preimage}
      </pre>
      <div style={{ marginTop: 10 }}>
        <KeyValue
          items={[
            { label: 'prevHash', value: event.prevHash, mono: true },
            { label: 'hash', value: event.hash, mono: true },
            {
              label: 'recomputed',
              value:
                fresh === null ? (
                  'computing…'
                ) : (
                  <>
                    {fresh}{' '}
                    {fresh === event.hash ? <Badge variant="ok">match</Badge> : <Badge variant="fail">mismatch</Badge>}
                  </>
                ),
              mono: true,
            },
          ]}
        />
      </div>
    </Panel>
  )
}

function SealsAnchors({
  evidence,
  result,
  running,
  onVerify,
}: {
  evidence: Evidence
  result: VerificationResult | null
  running: boolean
  onVerify: () => void
}) {
  const flagged = (codes: readonly string[], seq: number) =>
    result?.findings.some((f) => f.severity === 'error' && codes.includes(f.code) && f.seq === seq) ?? false
  return (
    <Panel
      title="Seals and anchors"
      actions={
        <>
          <Badge variant="simulated">anchor store simulated</Badge>
          {result === null || running ? (
            <Badge variant="warn">running</Badge>
          ) : result.ok ? (
            <Badge variant="ok">PASS</Badge>
          ) : (
            <Badge variant="fail">FAIL</Badge>
          )}
        </>
      }
    >
      <div className="ax-row" style={{ marginBottom: 10 }}>
        <button type="button" className="ax-btn ax-btn--primary" onClick={onVerify} disabled={running}>
          Verify
        </button>
        <Stat label="seals" value={evidence.seals.length} />
        <Stat label="anchors" value={evidence.anchors.length} />
      </div>
      <Table caption="Seals">
        <THead>
          <Th>Seq</Th>
          <Th>Key ID</Th>
          <Th>Signature</Th>
        </THead>
        <TBody>
          {evidence.seals.map((s) => (
            <Tr key={s.seq}>
              <Td mono>{s.seq}</Td>
              <Td mono>{s.keyId.slice(0, 8)}</Td>
              <Td>
                {result === null ? (
                  <Badge variant="warn">unchecked</Badge>
                ) : flagged(['SEAL_INVALID'], s.seq) ? (
                  <Badge variant="fail">invalid</Badge>
                ) : (
                  <Badge variant="ok">valid</Badge>
                )}
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
      <div style={{ height: 12 }} />
      <Table caption="Anchors">
        <THead>
          <Th>Seq</Th>
          <Th>Digest</Th>
          <Th>Stored</Th>
        </THead>
        <TBody>
          {evidence.anchors.map((a) => (
            <Tr key={a.seq}>
              <Td mono>{a.seq}</Td>
              <Td mono>{short(a.anchorDigest, 10)}</Td>
              <Td>
                {result === null ? (
                  <Badge variant="warn">unchecked</Badge>
                ) : flagged(['ANCHOR_MISMATCH', 'ANCHOR_MISSING'], a.seq) ? (
                  <Badge variant="fail">mismatch</Badge>
                ) : (
                  <Badge variant="ok">stored</Badge>
                )}
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </Panel>
  )
}
