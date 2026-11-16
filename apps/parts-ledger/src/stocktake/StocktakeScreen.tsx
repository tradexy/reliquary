/**
 * StocktakeScreen — the core interaction for the Parts Ledger.
 *
 * Layout:
 *   - Top bar: walk range label (mono) + End walk button, 1px divider below.
 *   - Progress: 4px accent rail, then three counters (Checked / Matched / Discrepant)
 *     as tabular-numeral figures. Discrepant turns danger colour when above zero.
 *   - Entry card: max-width 46rem, centred. Part number mono accent + bin chip +
 *     status chip. Description in display serif 1.6rem. Three-cell meta grid
 *     (ledger qty, price, last moved) separated by 1px vertical rules.
 *   - Counted input: 4rem wide, mono 1.4rem, centred. − and + step buttons either
 *     side. Full-width confirm button in accent.
 *   - Discrepancy form: inline beneath the card, note + initials side by side,
 *     danger border on the panel.
 *
 * State lives entirely in memory via props — no localStorage. The parent
 * (App.tsx) owns the session and passes it down.
 */

import React, { useState, useCallback, useRef, useEffect, useId } from 'react'
import type { LedgerEntry } from '../source/ledgerSource.js'
import type { StocktakeSession, CheckedItem, BinRange } from './types.js'
import { computeTally } from './types.js'

interface StocktakeScreenProps {
  session: StocktakeSession
  onCheck(partNo: string, item: CheckedItem): void
  onFinish(): void
  onRestart(): void
}

export function StocktakeScreen({ session, onCheck, onFinish, onRestart }: StocktakeScreenProps) {
  const { entries, checked, binRange } = session
  const tally = computeTally(checked)

  const currentIndex = entries.findIndex((e) => !checked.has(e.partNo))
  const isComplete = currentIndex === -1

  if (entries.length === 0) {
    return <EmptyRange binRange={binRange} onRestart={onRestart} />
  }

  if (isComplete) {
    return <WalkComplete tally={tally} session={session} onRestart={onRestart} onFinish={onFinish} />
  }

  const current = entries[currentIndex]!
  const pct = entries.length > 0 ? Math.round((tally.checked / entries.length) * 100) : 0

  return (
    <div
      style={{
        fontFamily: 'var(--font-body)',
        color: 'var(--color-ink)',
      }}
    >
      {/* ── Top bar ── */}
      <div
        style={{
          padding: '0.6rem var(--density)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          borderBottom: '1px solid var(--color-bone)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            color: 'var(--color-ink)',
            letterSpacing: '0.03em',
          }}
        >
          Walk: bins {binRange.from}–{binRange.to}
        </span>
        <button
          type="button"
          onClick={onRestart}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            padding: '0.25rem 0.6rem',
            background: 'none',
            color: 'var(--color-muted)',
            border: '1px solid var(--color-bone)',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
          }}
        >
          End walk
        </button>
      </div>

      {/* ── Progress zone ── */}
      <div style={{ padding: 'var(--density) 0 0', maxWidth: '46rem', margin: '0 auto' }}>
        {/* 4px rail */}
        <div
          role="progressbar"
          aria-valuenow={tally.checked}
          aria-valuemin={0}
          aria-valuemax={entries.length}
          aria-label={`${tally.checked} of ${entries.length} items checked`}
          style={{
            height: '4px',
            background: 'rgba(200, 186, 168, 0.15)',
            borderRadius: '2px',
            marginBottom: '0.75rem',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: 'var(--color-accent)',
              transition: 'width var(--motion-duration, 150ms) ease',
            }}
          />
        </div>

        {/* Three counters */}
        <div
          style={{
            display: 'flex',
            gap: '2rem',
            marginBottom: 'var(--density)',
            flexWrap: 'wrap',
          }}
        >
          <TallyFigure label="Checked" value={tally.checked} sub={`/${entries.length}`} />
          <TallyFigure label="Matched" value={tally.matched} />
          <TallyFigure
            label="Discrepant"
            value={tally.discrepant}
            danger={tally.discrepant > 0}
          />
        </div>
      </div>

      {/* ── Entry card (centred, max 46rem) ── */}
      <div
        style={{
          padding: '0 var(--density) var(--density)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <EntryCheckCard entry={current} onCheck={onCheck} />
      </div>

      {/* Checked items list */}
      {checked.size > 0 && (
        <div style={{ padding: '0 var(--density) var(--density)' }}>
          <CheckedList checked={checked} />
        </div>
      )}
    </div>
  )
}

// ── TallyFigure ───────────────────────────────────────────────────────────────

function TallyFigure({
  label,
  value,
  sub,
  danger,
}: {
  label: string
  value: number
  sub?: string
  danger?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--color-muted)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '1.5rem',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          color: danger ? 'var(--color-danger)' : 'var(--color-ink)',
        }}
      >
        {value}
        {sub && (
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-muted)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {sub}
          </span>
        )}
      </span>
    </div>
  )
}

// ── EntryCheckCard ────────────────────────────────────────────────────────────

interface EntryCheckCardProps {
  entry: LedgerEntry
  onCheck(partNo: string, item: CheckedItem): void
}

function EntryCheckCard({ entry, onCheck }: EntryCheckCardProps) {
  const [counted, setCounted] = useState('')
  const [note, setNote] = useState('')
  const [initials, setInitials] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const countedId = useId()
  const noteId = useId()
  const initialsId = useId()

  // Reset form when moving to a new entry.
  const prevPartNo = useRef(entry.partNo)
  useEffect(() => {
    if (prevPartNo.current !== entry.partNo) {
      setCounted('')
      setNote('')
      setInitials('')
      setSubmitted(false)
      prevPartNo.current = entry.partNo
    }
  }, [entry.partNo])

  const countedNum = counted.trim() === '' ? null : parseInt(counted.trim(), 10)
  const isMatch = countedNum !== null && countedNum === entry.qty
  const isDiscrepant = countedNum !== null && countedNum !== entry.qty
  const needsNote = isDiscrepant && (note.trim() === '' || initials.trim() === '')

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      setSubmitted(true)
      if (countedNum === null) return
      if (needsNote) return

      if (isMatch) {
        onCheck(entry.partNo, { entry, outcome: { kind: 'matched' } })
      } else {
        onCheck(entry.partNo, {
          entry,
          outcome: {
            kind: 'discrepant',
            counted: countedNum,
            note: note.trim(),
            initials: initials.trim().toUpperCase(),
          },
        })
      }
    },
    [countedNum, isMatch, needsNote, note, initials, entry, onCheck],
  )

  const decrement = useCallback(() => {
    const n = countedNum ?? 0
    setCounted(String(Math.max(0, n - 1)))
  }, [countedNum])

  const increment = useCallback(() => {
    const n = countedNum ?? 0
    setCounted(String(n + 1))
  }, [countedNum])

  const pricePounds = entry.priceP !== null ? `£${(entry.priceP / 100).toFixed(2)}` : '—'

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '46rem',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-bone)',
        borderRadius: 'var(--radius)',
      }}
    >
      {/* ── Identity line: part number + bin chip + status chip ── */}
      <div
        style={{
          padding: '0.75rem var(--density) 0.6rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--color-bone)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1.1rem',
            color: 'var(--color-accent)',
          }}
        >
          {entry.partNo}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--color-muted)',
            border: '1px solid var(--color-bone)',
            padding: '0.1rem 0.4rem',
            borderRadius: 'var(--radius)',
          }}
        >
          {entry.bin}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: entry.status === 'discontinued' ? 'var(--color-danger)' : 'var(--color-muted)',
          }}
        >
          {entry.status}
        </span>
      </div>

      {/* ── Description + vehicle ── */}
      <div style={{ padding: '0.75rem var(--density) 0.5rem' }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.6rem',
            lineHeight: 1.2,
            color: 'var(--color-ink)',
            marginBottom: '0.3rem',
          }}
        >
          {entry.description}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            color: 'var(--color-muted)',
          }}
        >
          {entry.vehicle}
        </div>
      </div>

      {/* ── Three-cell meta grid ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          borderTop: '1px solid var(--color-bone)',
          borderBottom: '1px solid var(--color-bone)',
          margin: '0',
        }}
      >
        <MetaCell label="Ledger qty" value={String(entry.qty)} large />
        <MetaCell label="Price" value={pricePounds} divider />
        <MetaCell label="Last moved" value={entry.lastMoved ?? '—'} divider />
      </div>

      {/* ── Counted input ── */}
      <div style={{ padding: 'var(--density)' }}>
        <label
          htmlFor={countedId}
          style={{
            display: 'block',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--color-muted)',
            marginBottom: '0.4rem',
          }}
        >
          Counted
        </label>

        {/* − [input] + */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.75rem',
          }}
        >
          <StepButton
            aria-label="Decrease count by one"
            onClick={decrement}
            disabled={countedNum !== null && countedNum <= 0}
          >
            −
          </StepButton>

          <input
            id={countedId}
            type="number"
            min="0"
            step="1"
            value={counted}
            onChange={(e) => setCounted(e.target.value)}
            placeholder={String(entry.qty)}
            aria-label="Counted quantity"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1.4rem',
              textAlign: 'center',
              width: '4rem',
              padding: '0.3rem 0',
              background: 'var(--color-bg)',
              color: isMatch
                ? 'var(--color-accent)'
                : isDiscrepant
                  ? 'var(--color-danger)'
                  : 'var(--color-ink)',
              border: `1px solid ${
                isMatch
                  ? 'var(--color-accent)'
                  : isDiscrepant
                    ? 'var(--color-danger)'
                    : 'var(--color-bone)'
              }`,
              borderRadius: 'var(--radius)',
              outline: 'none',
              // Remove browser spin buttons — we have our own
              MozAppearance: 'textfield',
            } as React.CSSProperties}
          />

          <StepButton aria-label="Increase count by one" onClick={increment}>
            +
          </StepButton>

          {/* Inline match/discrepancy indicator */}
          {isMatch && (
            <span
              aria-live="polite"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-accent)' }}
            >
              ✓ Match
            </span>
          )}
          {isDiscrepant && (
            <span
              aria-live="polite"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-danger)' }}
            >
              ✕ {countedNum! > entry.qty ? '+' : ''}{countedNum! - entry.qty}
            </span>
          )}
        </div>

        {/* ── Discrepancy form — inline beneath, danger border ── */}
        {isDiscrepant && (
          <div
            style={{
              border: `1px solid var(--color-danger)`,
              borderRadius: 'var(--radius)',
              padding: '0.75rem',
              marginBottom: '0.75rem',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label
                htmlFor={noteId}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-muted)',
                }}
              >
                Note
              </label>
              <input
                id={noteId}
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. shelf empty, damaged packaging"
                aria-required="true"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.875rem',
                  padding: '0.4rem 0.6rem',
                  background: 'var(--color-bg)',
                  color: 'var(--color-ink)',
                  border: `1px solid ${submitted && !note.trim() ? 'var(--color-danger)' : 'var(--color-bone)'}`,
                  borderRadius: 'var(--radius)',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label
                htmlFor={initialsId}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-muted)',
                }}
              >
                Initials
              </label>
              <input
                id={initialsId}
                type="text"
                maxLength={4}
                value={initials}
                onChange={(e) => setInitials(e.target.value.toUpperCase())}
                placeholder="JRH"
                aria-required="true"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.875rem',
                  padding: '0.4rem 0.6rem',
                  background: 'var(--color-bg)',
                  color: 'var(--color-ink)',
                  border: `1px solid ${submitted && !initials.trim() ? 'var(--color-danger)' : 'var(--color-bone)'}`,
                  borderRadius: 'var(--radius)',
                  outline: 'none',
                  width: '5rem',
                }}
              />
            </div>
          </div>
        )}

        {/* Validation messages */}
        {submitted && needsNote && (
          <p role="alert" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-danger)', margin: '0 0 0.5rem' }}>
            Discrepancy requires a note and initials.
          </p>
        )}
        {submitted && countedNum === null && (
          <p role="alert" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', color: 'var(--color-danger)', margin: '0 0 0.5rem' }}>
            Enter a counted quantity.
          </p>
        )}

        {/* Full-width confirm button */}
        <form onSubmit={handleSubmit} noValidate>
          <button
            type="submit"
            style={{
              display: 'block',
              width: '100%',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9rem',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              padding: '0.65rem 1rem',
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
              border: 'none',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
            }}
          >
            Confirm
          </button>
        </form>
      </div>
    </div>
  )
}

// ── StepButton ────────────────────────────────────────────────────────────────

function StepButton({
  children,
  onClick,
  disabled,
  'aria-label': ariaLabel,
}: {
  children: React.ReactNode
  onClick(): void
  disabled?: boolean
  'aria-label': string
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '1.1rem',
        width: '2.25rem',
        height: '2.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-surface)',
        color: disabled ? 'var(--color-muted)' : 'var(--color-ink)',
        border: '1px solid var(--color-bone)',
        borderRadius: 'var(--radius)',
        cursor: disabled ? 'default' : 'pointer',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

// ── MetaCell ──────────────────────────────────────────────────────────────────

function MetaCell({
  label,
  value,
  large,
  divider,
}: {
  label: string
  value: string
  large?: boolean
  divider?: boolean
}) {
  return (
    <div
      style={{
        padding: '0.6rem 0.75rem',
        borderLeft: divider ? '1px solid var(--color-bone)' : undefined,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--color-muted)',
          marginBottom: '0.2rem',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: large ? '1.5rem' : '0.9rem',
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--color-ink)',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
    </div>
  )
}

// ── CheckedList ───────────────────────────────────────────────────────────────

function CheckedList({ checked }: { checked: Map<string, CheckedItem> }) {
  const items = Array.from(checked.values()).reverse()

  return (
    <details style={{ marginTop: '0.5rem' }}>
      <summary
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          color: 'var(--color-muted)',
          cursor: 'pointer',
          listStyle: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          marginBottom: '0.4rem',
        }}
      >
        ▸ Checked items ({checked.size})
      </summary>
      <ol
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
        }}
      >
        {items.map((item, idx) => (
          <li
            key={item.entry.partNo}
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'baseline',
              padding: '0.3rem 0.5rem',
              // Greenbar alternating rows at 4% bone opacity
              background: idx % 2 === 0 ? 'rgba(200, 186, 168, 0.04)' : 'transparent',
              borderLeft: `3px solid ${item.outcome.kind === 'matched' ? 'var(--color-accent)' : 'var(--color-danger)'}`,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
            }}
          >
            <span style={{ color: 'var(--color-accent)' }}>{item.entry.partNo}</span>
            <span style={{ color: 'var(--color-muted)' }}>{item.entry.bin}</span>
            {item.outcome.kind === 'matched' ? (
              <span style={{ color: 'var(--color-accent)' }}>✓</span>
            ) : (
              <span style={{ color: 'var(--color-danger)' }}>
                counted {item.outcome.counted} / ledger {item.entry.qty} — {item.outcome.note}
              </span>
            )}
          </li>
        ))}
      </ol>
    </details>
  )
}

// ── EmptyRange ────────────────────────────────────────────────────────────────

function EmptyRange({ binRange, onRestart }: { binRange: BinRange; onRestart(): void }) {
  return (
    <div
      role="status"
      style={{
        padding: 'var(--density)',
        fontFamily: 'var(--font-body)',
        color: 'var(--color-muted)',
      }}
    >
      <p style={{ fontStyle: 'italic', marginBottom: 'var(--density)' }}>
        No entries found in bins {binRange.from}–{binRange.to}.
      </p>
      <button
        type="button"
        onClick={onRestart}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.875rem',
          padding: '0.4rem 1rem',
          background: 'var(--color-surface)',
          color: 'var(--color-accent)',
          border: '1px solid var(--color-accent)',
          borderRadius: 'var(--radius)',
          cursor: 'pointer',
        }}
      >
        ← Choose a different range
      </button>
    </div>
  )
}

// ── WalkComplete ──────────────────────────────────────────────────────────────

interface WalkCompleteProps {
  tally: ReturnType<typeof computeTally>
  session: StocktakeSession
  onRestart(): void
  onFinish(): void
}

function WalkComplete({ tally, session, onRestart, onFinish }: WalkCompleteProps) {
  return (
    <div
      style={{
        padding: 'var(--density)',
        fontFamily: 'var(--font-body)',
        color: 'var(--color-ink)',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.25rem',
          margin: '0 0 0.5rem',
          color: 'var(--color-bone)',
        }}
      >
        Walk complete
      </h2>
      <p style={{ color: 'var(--color-muted)', marginBottom: 'var(--density)', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}>
        Bins {session.binRange.from}–{session.binRange.to} · {tally.checked} items checked
      </p>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: 'var(--density)' }}>
        <TallyFigure label="Checked" value={tally.checked} sub={`/${session.entries.length}`} />
        <TallyFigure label="Matched" value={tally.matched} />
        <TallyFigure label="Discrepant" value={tally.discrepant} danger={tally.discrepant > 0} />
      </div>

      {tally.discrepant === 0 ? (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--color-accent)', marginBottom: 'var(--density)' }}>
          ✓ All items reconcile with the ledger.
        </p>
      ) : (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--color-danger)', marginBottom: 'var(--density)' }}>
          ✕ {tally.discrepant} discrepanc{tally.discrepant === 1 ? 'y' : 'ies'} recorded.
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onFinish}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.875rem',
            padding: '0.5rem 1.25rem',
            background: 'var(--color-accent)',
            color: 'var(--color-bg)',
            border: 'none',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          View & export →
        </button>
        <button
          type="button"
          onClick={onRestart}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.875rem',
            padding: '0.5rem 1.25rem',
            background: 'var(--color-surface)',
            color: 'var(--color-muted)',
            border: '1px solid var(--color-bone)',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
          }}
        >
          New walk
        </button>
      </div>
    </div>
  )
}
