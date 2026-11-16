/**
 * StocktakeScreen — the core interaction for the Parts Ledger.
 *
 * Presents ledger entries in the selected bin range one at a time (or as a
 * scrollable list when stepping through). For each entry the checker enters
 * a counted quantity. When the count matches the ledger quantity, the item is
 * marked matched. When it differs, the checker records a note and their
 * initials.
 *
 * State lives entirely in memory via props — no localStorage. The parent
 * (App.tsx) owns the session and passes it down.
 *
 * Layout: running tally at the top, current item card in the centre, action
 * buttons below. The checker can jump to the next item without entering a
 * count (skipping), but skipped items are not counted in the tally.
 *
 * The kit's Report component is reused on the final summary screen.
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

  // Find the first unchecked entry.
  const currentIndex = entries.findIndex((e) => !checked.has(e.partNo))
  const isComplete = currentIndex === -1

  if (entries.length === 0) {
    return <EmptyRange binRange={binRange} onRestart={onRestart} />
  }

  if (isComplete) {
    return <WalkComplete tally={tally} session={session} onRestart={onRestart} onFinish={onFinish} />
  }

  const current = entries[currentIndex]!

  return (
    <div
      style={{
        padding: 'var(--density)',
        fontFamily: 'var(--font-body)',
        color: 'var(--color-ink)',
      }}
    >
      {/* Header row: range label + tally + restart */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: 'var(--density)',
        }}
      >
        <div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8125rem',
              color: 'var(--color-muted)',
            }}
          >
            Walk: bins {binRange.from}–{binRange.to}
          </span>
        </div>
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
          ✕ End walk
        </button>
      </div>

      {/* Running tally */}
      <TallyBar tally={tally} total={entries.length} />

      {/* Progress indicator */}
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8125rem',
          color: 'var(--color-muted)',
          margin: '0 0 var(--density)',
        }}
      >
        Item {tally.checked + 1} of {entries.length}
      </p>

      {/* Current entry card + count form */}
      <EntryCheckCard entry={current} onCheck={onCheck} />

      {/* Checked items list */}
      {checked.size > 0 && <CheckedList checked={checked} />}
    </div>
  )
}

// ── TallyBar ─────────────────────────────────────────────────────────────────

interface TallyBarProps {
  tally: ReturnType<typeof computeTally>
  total: number
}

function TallyBar({ tally, total }: TallyBarProps) {
  const pct = total > 0 ? Math.round((tally.checked / total) * 100) : 0

  return (
    <div
      aria-label="Stocktake progress"
      style={{ marginBottom: 'var(--density)' }}
    >
      {/* Progress bar */}
      <div
        role="progressbar"
        aria-valuenow={tally.checked}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${tally.checked} of ${total} items checked`}
        style={{
          height: '4px',
          background: 'var(--color-surface)',
          borderRadius: '2px',
          marginBottom: '0.5rem',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: tally.discrepant > 0 ? 'var(--color-danger)' : 'var(--color-accent)',
            transition: 'width 150ms ease',
          }}
        />
      </div>

      {/* Stat chips */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <TallyChip label="Checked" value={tally.checked} total={total} />
        <TallyChip label="Matched" value={tally.matched} accent />
        <TallyChip label="Discrepant" value={tally.discrepant} danger={tally.discrepant > 0} />
      </div>
    </div>
  )
}

function TallyChip({
  label,
  value,
  total,
  accent,
  danger,
}: {
  label: string
  value: number
  total?: number
  accent?: boolean
  danger?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
      }}
    >
      <span style={{ color: 'var(--color-muted)' }}>{label}</span>
      <span
        style={{
          fontSize: '1.25rem',
          fontWeight: 'bold',
          color: danger
            ? 'var(--color-danger)'
            : accent
              ? 'var(--color-accent)'
              : 'var(--color-ink)',
        }}
      >
        {value}
        {total !== undefined && (
          <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--color-muted)' }}>
            /{total}
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

  // Reset form state when moving to a new entry.
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

  const pricePounds =
    entry.priceP !== null ? `£${(entry.priceP / 100).toFixed(2)}` : '—'

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-bone)',
        borderRadius: 'var(--radius)',
        padding: 'var(--density)',
        marginBottom: 'var(--density)',
      }}
    >
      {/* Part identity */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          marginBottom: '0.75rem',
          borderBottom: '1px solid var(--color-bone)',
          paddingBottom: '0.75rem',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1rem',
            color: 'var(--color-accent)',
            fontWeight: 'bold',
          }}
        >
          {entry.partNo}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            color: 'var(--color-muted)',
            border: '1px solid var(--color-bone)',
            padding: '0.1rem 0.4rem',
            borderRadius: 'var(--radius)',
          }}
        >
          BIN {entry.bin}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: entry.status === 'discontinued' ? 'var(--color-danger)' : 'var(--color-muted)',
            textTransform: 'uppercase',
          }}
        >
          {entry.status}
        </span>
      </div>

      {/* Description and vehicle */}
      <div style={{ marginBottom: '0.75rem' }}>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1rem',
            color: 'var(--color-ink)',
            marginBottom: '0.2rem',
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

      {/* Ledger figures */}
      <div
        style={{
          display: 'flex',
          gap: '1.5rem',
          marginBottom: 'var(--density)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8125rem',
        }}
      >
        <LedgerFigure label="Ledger qty" value={String(entry.qty)} />
        <LedgerFigure label="Price" value={pricePounds} />
        {entry.lastMoved && <LedgerFigure label="Last moved" value={entry.lastMoved} />}
      </div>

      {/* Count entry form */}
      <form onSubmit={handleSubmit} noValidate>
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-end',
            flexWrap: 'wrap',
            marginBottom: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label
              htmlFor={countedId}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: 'var(--color-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
              }}
            >
              Counted
            </label>
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
                fontSize: '1.25rem',
                padding: '0.4rem 0.6rem',
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
                width: '7rem',
              }}
            />
          </div>

          {/* Match indicator */}
          {isMatch && (
            <span
              aria-live="polite"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.875rem',
                color: 'var(--color-accent)',
                paddingBottom: '0.4rem',
              }}
            >
              ✓ Match
            </span>
          )}
          {isDiscrepant && (
            <span
              aria-live="polite"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.875rem',
                color: 'var(--color-danger)',
                paddingBottom: '0.4rem',
              }}
            >
              ✕ Discrepancy: {countedNum! > entry.qty ? '+' : ''}{countedNum! - entry.qty}
            </span>
          )}
        </div>

        {/* Note + initials — only shown when there is a discrepancy */}
        {isDiscrepant && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '0.5rem',
              marginBottom: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label
                htmlFor={noteId}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--color-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label
                htmlFor={initialsId}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--color-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
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

        {/* Validation message */}
        {submitted && needsNote && (
          <p
            role="alert"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8125rem',
              color: 'var(--color-danger)',
              margin: '0 0 0.5rem',
            }}
          >
            Discrepancy requires a note and initials.
          </p>
        )}
        {submitted && countedNum === null && (
          <p
            role="alert"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8125rem',
              color: 'var(--color-danger)',
              margin: '0 0 0.5rem',
            }}
          >
            Enter a counted quantity.
          </p>
        )}

        <button
          type="submit"
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
          Confirm →
        </button>
      </form>
    </div>
  )
}

function LedgerFigure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: 'var(--color-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div style={{ color: 'var(--color-ink)', fontSize: '0.9rem' }}>{value}</div>
    </div>
  )
}

// ── CheckedList ───────────────────────────────────────────────────────────────

function CheckedList({ checked }: { checked: Map<string, CheckedItem> }) {
  const items = Array.from(checked.values()).reverse()

  return (
    <details style={{ marginTop: 'var(--density)' }}>
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
        {items.map((item) => (
          <li
            key={item.entry.partNo}
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'baseline',
              padding: '0.3rem 0.5rem',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius)',
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

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: 'var(--density)' }}>
        <TallyChip label="Checked" value={tally.checked} total={session.entries.length} />
        <TallyChip label="Matched" value={tally.matched} accent />
        <TallyChip label="Discrepant" value={tally.discrepant} danger={tally.discrepant > 0} />
      </div>

      {tally.discrepant === 0 ? (
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.875rem',
            color: 'var(--color-accent)',
            marginBottom: 'var(--density)',
          }}
        >
          ✓ All items reconcile with the ledger.
        </p>
      ) : (
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.875rem',
            color: 'var(--color-danger)',
            marginBottom: 'var(--density)',
          }}
        >
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
