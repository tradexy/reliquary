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
  KIRO_AUDIT_BUNDLE,
  ORIGINAL,
  STORY_BEATS,
  areaOf,
  deleteRecord,
  deriveControls,
  diffEvent,
  editRecord,
  errorSeqs,
  insertRecord,
  matchesText,
  parseUploadedBundle,
  rewriteChainFrom,
  rowState,
} from './model.js'
import type { DemoBundle, Evidence, FieldDiff } from './model.js'
import { SealIntro } from './Intro.js'
import { ChainVisualizer } from './ChainVisualizer.js'

type Screen = 'start' | 'chain'
type SourceKind = 'northgate' | 'kiro' | 'custom'

const SCREENS: readonly { id: Screen; label: string }[] = [
  { id: 'start', label: 'Start here' },
  { id: 'chain', label: 'Chain' },
]

function parseHash(): { screen: Screen; seq: number | null } {
  const raw = window.location.hash.replace(/^#/, '')
  const [pathPart, queryPart] = raw.split('?')
  const screen: Screen = SCREENS.some((s) => s.id === pathPart) ? (pathPart as Screen) : 'start'
  let seq: number | null = null
  if (queryPart) {
    const params = new URLSearchParams(queryPart)
    const val = Number(params.get('seq'))
    if (Number.isInteger(val) && val > 0) seq = val
  }
  return { screen, seq }
}

function short(hash: string, n: number): string {
  return `${hash.slice(0, n)}…`
}

function compactTime(iso: string): string {
  // 2026-11-03T09:14:00.000Z -> 11-03 09:14
  if (iso.length >= 16) return `${iso.slice(5, 10)} ${iso.slice(11, 16)}`
  return iso
}

export interface AppProps {
  /** Evidence to show. Defaults to the committed demo bundle. */
  bundle?: DemoBundle
}

export function App({ bundle = ORIGINAL }: AppProps = {}) {
  const initialRoute = useMemo(() => parseHash(), [])
  const [sourceKind, setSourceKind] = useState<SourceKind>('northgate')
  const [uploadedBundle, setUploadedBundle] = useState<{ name: string; bundle: DemoBundle } | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const activeBundle =
    sourceKind === 'kiro'
      ? KIRO_AUDIT_BUNDLE
      : sourceKind === 'custom' && uploadedBundle !== null
        ? uploadedBundle.bundle
        : bundle

  // `tampered` is an in-memory copy; null means "showing the active bundle unmodified".
  const [tampered, setTampered] = useState<Evidence | null>(null)
  const [rewritten, setRewritten] = useState(false)
  const [selected, setSelected] = useState<number | null>(() => {
    if (initialRoute.seq !== null) {
      const idx = bundle.events.findIndex((e) => e.seq === initialRoute.seq)
      if (idx !== -1) return idx
    }
    return null
  })
  const [area, setArea] = useState('all')
  const [text, setText] = useState('')
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [running, setRunning] = useState(false)
  const [screen, setScreen] = useState<Screen>(initialRoute.screen)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const tableWrapRef = useRef<HTMLDivElement | null>(null)

  const go = (s: Screen) => {
    window.location.hash = s
    setScreen(s)
  }

  const evidence = tampered ?? activeBundle
  const runId = useRef(0)

  const run = useCallback(
    async (target: Evidence, targetBundle: DemoBundle) => {
      const id = ++runId.current
      setRunning(true)
      const r = await verifyChain(
        {
          formatVersion: targetBundle.formatVersion,
          events: target.events,
          seals: target.seals,
          anchors: target.anchors,
        },
        targetBundle.publicKeyPem,
        targetBundle.keyFingerprint,
      )
      // A newer run supersedes this one.
      if (id === runId.current) {
        setResult(r)
        setRunning(false)
      }
    },
    [],
  )

  // Initial verification on load and whenever activeBundle changes.
  useEffect(() => {
    void run(activeBundle, activeBundle)
  }, [run, activeBundle])

  // Keep deep-linked seq 217 convenient when opening the full Northgate bundle directly.
  useEffect(() => {
    if (screen === 'chain' && selected === null && sourceKind === 'northgate' && activeBundle.events.length >= 217) {
      const idx = activeBundle.events.findIndex((e) => e.seq === 217)
      if (idx !== -1) setSelected(idx)
    }
  }, [screen, selected, sourceKind, activeBundle])

  // Auto-scroll the selected row into view inside the Chain table container.
  useEffect(() => {
    if (screen !== 'chain' || selected === null) return
    const rowEl = tableWrapRef.current?.querySelector<HTMLElement>('tr[aria-current="true"]')
    if (rowEl && typeof rowEl.scrollIntoView === 'function') {
      rowEl.scrollIntoView({ block: 'nearest' })
    }
  }, [screen, selected, sourceKind])

  const apply = useCallback(
    (next: Evidence | null, isRewrite = false) => {
      setTampered(next)
      setRewritten(isRewrite)
      void run(next ?? activeBundle, activeBundle)
    },
    [run, activeBundle],
  )

  const switchSource = (kind: SourceKind) => {
    setSourceKind(kind)
    setUploadError(null)
    setTampered(null)
    setRewritten(false)
    setArea('all')
    setText('')
    window.location.hash = 'chain'
    setSelected(kind === 'northgate' && bundle.events.length >= 217 ? 216 : 0)
  }

  const readFileText = (file: File): Promise<string> => {
    if (typeof file.text === 'function') return file.text()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = () => reject(new Error('Could not read file.'))
      reader.readAsText(file)
    })
  }

  const loadFile = async (file: File) => {
    const content = await readFileText(file)
    const parsed = parseUploadedBundle(content)
    if (!parsed.ok) {
      setUploadError(parsed.error)
      return
    }
    setUploadError(null)
    setUploadedBundle({ name: file.name, bundle: parsed.bundle })
    setSourceKind('custom')
    setTampered(null)
    setRewritten(false)
    setArea('all')
    setText('')
    setSelected(parsed.bundle.events.length > 0 ? 0 : null)
  }

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
  const originalMatch =
    selectedEvent === null
      ? undefined
      : activeBundle.events.find((e) => e.seq === selectedEvent.seq)
  const diffs = useMemo(
    () => (tampered !== null ? diffEvent(originalMatch, selectedEvent) : []),
    [tampered, originalMatch, selectedEvent],
  )

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

  const headerStatus =
    result === null || running ? (
      <Badge variant="warn">verifying</Badge>
    ) : result.ok ? (
      <Badge variant="ok">PASS · {result.counts.events} events</Badge>
    ) : (
      <Badge variant="fail">FAIL · divergence {result.firstDivergence ?? '?'}</Badge>
    )

  return (
    <AppShell
      theme={sealTheme}
      activeApp="seal"
      status={headerStatus}
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
        keyFingerprint: activeBundle.keyFingerprint,
        events: evidence.events.length,
        rejections: refused,
      }}
    >
      {screen === 'start' ? <SealIntro onOpen={() => go('chain')} /> : null}
      {screen === 'chain' ? (
        <>
          <div
            className={`ax-dropzone${dragging ? ' is-drag' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              const file = e.dataTransfer.files[0]
              if (file) void loadFile(file)
            }}
          >
            <div className="ax-pills" aria-label="Evidence bundle presets">
              <span className="ax-mono" style={{ fontSize: 11.5, color: 'var(--color-muted)' }}>
                Bundle:
              </span>
              <button
                type="button"
                className={`ax-pill${sourceKind === 'northgate' ? ' is-active' : ''}`}
                onClick={() => switchSource('northgate')}
              >
                Northgate Bank ({bundle.events.length})
              </button>
              <button
                type="button"
                className={`ax-pill${sourceKind === 'kiro' ? ' is-active' : ''}`}
                onClick={() => switchSource('kiro')}
              >
                Kiro Build Trail ({KIRO_AUDIT_BUNDLE.events.length})
              </button>
              {uploadedBundle !== null ? (
                <button
                  type="button"
                  className={`ax-pill${sourceKind === 'custom' ? ' is-active' : ''}`}
                  onClick={() => switchSource('custom')}
                >
                  {uploadedBundle.name} ({uploadedBundle.bundle.events.length})
                </button>
              ) : null}
            </div>
            <div className="ax-row">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                aria-label="Verify JSON bundle file"
                className="ax-visually-hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void loadFile(file)
                }}
              />
              <button
                type="button"
                className="ax-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Drop or open bundle .json
              </button>
            </div>
          </div>
          {uploadError !== null ? (
            <p role="alert" style={{ color: 'var(--color-danger)', margin: '0 0 12px', fontSize: 13 }}>
              {uploadError}
            </p>
          ) : null}

          <Panel title="Controls">
            <ControlPanel controls={controls} />
          </Panel>

          <ChainVisualizer
            evidence={evidence}
            selected={selected}
            result={result}
            rewritten={rewritten}
            onSelectSeq={selectSeq}
          />

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
                {sourceKind === 'northgate' && evidence.events.length >= 401 ? (
                  <div className="ax-pills" style={{ marginBottom: 10 }} aria-label="Story beats">
                    <span className="ax-mono" style={{ fontSize: 11, color: 'var(--color-muted)' }}>
                      Jump:
                    </span>
                    {STORY_BEATS.map((beat) => (
                      <button
                        key={beat.seq}
                        type="button"
                        className={`ax-pill${selectedEvent?.seq === beat.seq ? ' is-active' : ''}`}
                        onClick={() => selectSeq(beat.seq)}
                      >
                        {beat.label}
                      </button>
                    ))}
                  </div>
                ) : null}
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
                      style={{ minWidth: 215 }}
                      type="search"
                      value={text}
                      placeholder="seq, action, actor, subject"
                      onChange={(e) => setText(e.target.value)}
                    />
                  </label>
                  <span className="ax-mono" role="status" style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                    {visible.length} of {evidence.events.length} records
                  </span>
                  <span className="ax-mono ax-scroll-hint" aria-hidden="true">
                    · scroll →
                  </span>
                </div>
                <div ref={tableWrapRef}>
                  <Table caption="Audit events" hideCaption>
                    <THead>
                      <Th>Seq</Th>
                      <Th>Time</Th>
                      <Th>Action</Th>
                      <Th>Actor</Th>
                      <Th>Subject</Th>
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
                            <Td mono>
                              <span className="ax-nowrap">{ev.seq}</span>
                            </Td>
                            <Td mono>
                              <span className="ax-nowrap" title={ev.at}>
                                {compactTime(ev.at)}
                              </span>
                            </Td>
                            <Td>
                              <span className="ax-nowrap">{ev.action}</span>
                            </Td>
                            <Td>
                              <span className="ax-nowrap">{ev.actor.id}</span>
                            </Td>
                            <Td>
                              <div className="ax-truncate" title={ev.subject}>
                                {ev.subject}
                              </div>
                            </Td>
                            <Td mono>
                              <span className="ax-nowrap">{ev.hash.slice(0, 8)}</span>
                            </Td>
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
                </div>
                {visible.length === 0 ? <p className="ax-empty" style={{ marginTop: 10 }}>No records match these filters.</p> : null}
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
              <RecordDetail event={selectedEvent} diffs={diffs} />

              <Panel title="Tamper simulator">
                <p className="ax-empty" style={{ marginBottom: 10 }}>
                  Changes apply to an in-memory copy. The original bundle is never modified.
                </p>
                <div className="ax-row">
                  <button
                    type="button"
                    className="ax-btn ax-btn--danger"
                    disabled={selected === null}
                    onClick={() => selected !== null && apply(editRecord(evidence, selected), false)}
                  >
                    Edit this record
                  </button>
                  <button
                    type="button"
                    className="ax-btn ax-btn--danger"
                    disabled={selected === null}
                    onClick={() => {
                      if (selected === null) return
                      apply(deleteRecord(evidence, selected), false)
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
                      void insertRecord(evidence, selected).then((next) => apply(next, false))
                    }}
                  >
                    Insert a record
                  </button>
                  <button
                    type="button"
                    className="ax-btn ax-btn--danger"
                    disabled={selected === null}
                    onClick={() => {
                      if (selected === null) return
                      void rewriteChainFrom(evidence, selected).then((next) => apply(next, true))
                    }}
                  >
                    Rewrite chain from here
                  </button>
                  <button
                    type="button"
                    className="ax-btn ax-btn--primary"
                    disabled={tampered === null}
                    onClick={() => apply(null, false)}
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
                onVerify={() => void run(evidence, activeBundle)}
              />
            </div>
          </div>
        </>
      ) : null}
    </AppShell>
  )
}

function RecordDetail({ event, diffs }: { event: AuditEvent | null; diffs: readonly FieldDiff[] }) {
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
      {diffs.length > 0 ? (
        <div className="ax-diff" data-testid="record-diff">
          <strong>Tampered field{diffs.length === 1 ? '' : 's'}:</strong>{' '}
          {diffs.map((d) => (
            <div key={d.field} className="ax-mono">
              {d.field}: <span className="ax-diff-old">{d.before}</span> →{' '}
              <span className="ax-diff-new">{d.after}</span>
            </div>
          ))}
        </div>
      ) : null}
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
