import type { AuditEvent, VerificationResult } from '@anchora/core/chain'
import type { Evidence } from './model.js'

interface ChainVisualizerProps {
  evidence: Evidence
  selected: number | null
  result: VerificationResult | null
  rewritten: boolean
  onSelectSeq: (seq: number) => void
}

export function ChainVisualizer({
  evidence,
  selected,
  result,
  rewritten,
  onSelectSeq,
}: ChainVisualizerProps) {
  const events = evidence.events
  if (events.length === 0) return null

  // Focus around the first divergence if tampered, otherwise around selected row.
  const focusSeq =
    result && result.firstDivergence !== null
      ? result.firstDivergence
      : selected !== null && events[selected]
        ? events[selected]!.seq
        : events[Math.min(216, events.length - 1)]!.seq

  const focusIdx = Math.max(
    0,
    events.findIndex((e) => e.seq === focusSeq),
  )
  const start = Math.max(0, Math.min(focusIdx - 1, events.length - 3))
  const windowEvents: AuditEvent[] = events.slice(start, start + 3)

  const chainErrors = new Set(
    (result?.findings ?? [])
      .filter(
        (f) =>
          f.severity === 'error' &&
          (f.code === 'HASH_MISMATCH' || f.code === 'LINK_BROKEN' || f.code === 'SEQ_GAP'),
      )
      .map((f) => f.seq),
  )
  const sealAnchorFails = (result?.findings ?? []).filter(
    (f) => f.code === 'SEAL_INVALID' || f.code === 'ANCHOR_MISMATCH' || f.code === 'ANCHOR_MISSING',
  )
  const nextCheckpoint =
    evidence.anchors.find((a) => a.seq >= focusSeq) ??
    evidence.seals.find((s) => s.seq >= focusSeq) ??
    evidence.anchors[evidence.anchors.length - 1] ??
    evidence.seals[evidence.seals.length - 1]

  const checkpointFailed =
    nextCheckpoint !== undefined && sealAnchorFails.some((f) => f.seq === nextCheckpoint.seq)
  const anyCheckpointFailed = sealAnchorFails.length > 0

  return (
    <div className="ax-vis" data-testid="chain-visualizer">
      <svg
        viewBox="0 0 760 106"
        width="100%"
        height="106"
        role="img"
        aria-label="Cryptographic chain visualizer showing event links and external seal anchor"
        style={{ display: 'block', minWidth: 580 }}
      >
        {windowEvents.map((ev, idx) => {
          const x = 8 + idx * 184
          const isBad = chainErrors.has(ev.seq)
          const isLawful = ev.lawful !== 'none' && !isBad
          const isSelected = selected !== null && events[selected]?.seq === ev.seq
          const stroke = isBad
            ? 'var(--color-danger)'
            : rewritten
              ? 'var(--color-bone)'
              : isSelected
                ? 'var(--color-accent)'
                : 'rgba(155,167,180,0.45)'
          const nextEv = windowEvents[idx + 1]
          const nextBad = nextEv !== undefined && chainErrors.has(nextEv.seq)
          const linkBroken = isBad || nextBad

          return (
            <g key={`${ev.seq}-${idx}`}>
              <g
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectSeq(ev.seq)}
                role="button"
                tabIndex={0}
                aria-label={`Inspect seq ${ev.seq}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelectSeq(ev.seq)
                  }
                }}
              >
                <rect
                  x={x}
                  y={10}
                  width={150}
                  height={82}
                  rx={4}
                  fill="var(--color-surface)"
                  stroke={stroke}
                  strokeWidth={isSelected || isBad ? 2 : 1}
                />
                <text
                  x={x + 12}
                  y={30}
                  fill={isBad ? 'var(--color-danger)' : 'var(--color-ink)'}
                  fontSize={12}
                  fontWeight={700}
                  fontFamily="var(--font-mono)"
                >
                  seq {ev.seq} {isLawful ? '· lawful' : ''}
                </text>
                <text x={x + 12} y={49} fill="var(--color-muted)" fontSize={10.5} fontFamily="var(--font-body)">
                  {ev.action.length > 21 ? `${ev.action.slice(0, 20)}…` : ev.action}
                </text>
                <text x={x + 12} y={67} fill="var(--color-bone)" fontSize={10.5} fontFamily="var(--font-mono)">
                  prev {ev.prevHash.slice(0, 8)}…
                </text>
                <text
                  x={x + 12}
                  y={82}
                  fill={isBad ? 'var(--color-danger)' : 'var(--color-accent)'}
                  fontSize={10.5}
                  fontFamily="var(--font-mono)"
                >
                  hash {ev.hash.slice(0, 8)}…
                </text>
              </g>
              {idx < windowEvents.length - 1 ? (
                <g>
                  <line
                    x1={x + 150}
                    y1={51}
                    x2={x + 184}
                    y2={51}
                    stroke={linkBroken ? 'var(--color-danger)' : 'var(--color-accent)'}
                    strokeWidth={2}
                    strokeDasharray={linkBroken ? '4 3' : undefined}
                  />
                  <text
                    x={x + 167}
                    y={44}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={700}
                    fontFamily="var(--font-mono)"
                    fill={linkBroken ? 'var(--color-danger)' : 'var(--color-accent)'}
                  >
                    {linkBroken ? '✕' : '→'}
                  </text>
                </g>
              ) : null}
            </g>
          )
        })}

        {/* Connector from chain window to Seal & Anchor vault */}
        <line
          x1={530}
          y1={51}
          x2={578}
          y2={51}
          stroke={anyCheckpointFailed ? 'var(--color-danger)' : 'var(--color-accent)'}
          strokeWidth={2}
          strokeDasharray={anyCheckpointFailed ? '4 3' : undefined}
        />
        <text
          x={554}
          y={44}
          textAnchor="middle"
          fontSize={12}
          fontWeight={700}
          fontFamily="var(--font-mono)"
          fill={anyCheckpointFailed ? 'var(--color-danger)' : 'var(--color-accent)'}
        >
          {anyCheckpointFailed ? '✕' : '→'}
        </text>

        <rect
          x={578}
          y={10}
          width={174}
          height={82}
          rx={4}
          fill="var(--color-surface)"
          stroke={anyCheckpointFailed ? 'var(--color-danger)' : 'var(--color-accent)'}
          strokeWidth={2}
          strokeDasharray={anyCheckpointFailed ? undefined : '4 2'}
        />
        <text
          x={590}
          y={30}
          fill={anyCheckpointFailed ? 'var(--color-danger)' : 'var(--color-accent)'}
          fontSize={11.5}
          fontWeight={700}
          fontFamily="var(--font-mono)"
        >
          {anyCheckpointFailed ? 'ANCHOR BROKEN' : 'SEAL + ANCHOR'}
        </text>
        <text x={590} y={49} fill="var(--color-ink)" fontSize={11} fontFamily="var(--font-mono)">
          {nextCheckpoint ? `checkpoint seq ${nextCheckpoint.seq}` : 'no seal in slice'}
        </text>
        <text x={590} y={67} fill="var(--color-muted)" fontSize={10.5} fontFamily="var(--font-body)">
          {checkpointFailed || anyCheckpointFailed
            ? 'Recomputed chain ≠ external seal'
            : 'Ed25519 + create-only WORM'}
        </text>
        <text x={590} y={82} fill="var(--color-muted)" fontSize={10} fontFamily="var(--font-mono)">
          {evidence.seals.length} seals · {evidence.anchors.length} anchors
        </text>
      </svg>
      <p className="ax-vis-note" data-bad={result !== null && !result.ok ? 'true' : undefined}>
        {result === null
          ? 'Verifying cryptographic links…'
          : result.ok
            ? 'Chain intact: every SHA-256 link, Ed25519 seal, and create-only anchor matches.'
            : rewritten && chainErrors.size === 0
              ? `Rewrite attack caught: all ${evidence.events.length} event hashes recomputed cleanly, but external Seal & Anchor verification failed at seq ${result.firstDivergence}.`
              : `Divergence detected at seq ${result.firstDivergence}: the stored hash no longer matches the canonical preimage or link.`}
      </p>
    </div>
  )
}
