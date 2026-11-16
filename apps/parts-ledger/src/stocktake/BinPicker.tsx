/**
 * BinPicker — the landing screen for the Parts Ledger.
 *
 * Two-column layout above 900px: form on the left, context panel on the right.
 * Below 900px the context panel collapses below the form.
 *
 * The primary interaction is a stocktake walk, so the first question is
 * always "which bin range?" — not "what are you searching for?".
 *
 * Quick-pick buttons populate common row ranges so a yard foreman can begin
 * immediately without typing. The active pick is highlighted with accent background.
 *
 * Valid bin codes are letter(s) + number, e.g. A1, B12, D9.
 * The picker validates both inputs before enabling the Start button.
 */

import React, { useState, useCallback, useId } from 'react'
import { parseBin } from './types.js'
import type { BinRange } from './types.js'

interface BinPickerProps {
  /** Available bin codes from the loaded repository (used for quick-picks and stats). */
  availableBins: string[]
  /** Reconciliation report, so the stats describe the whole ledger, not just readable rows. */
  report?: { rowsIn: number; rowsOut: number; rejected: unknown[] }
  onStart(range: BinRange): void
}

/** Derive unique row letters from the available bins, in sorted order. */
function uniqueRows(bins: string[]): string[] {
  const rows = new Set<string>()
  for (const bin of bins) {
    const p = parseBin(bin)
    if (p) rows.add(p.row)
  }
  return Array.from(rows).sort()
}

/** Minimum and maximum position for a row among the available bins. */
function rowBounds(row: string, bins: string[]): { min: number; max: number } | null {
  const positions = bins
    .map(parseBin)
    .filter((p): p is NonNullable<ReturnType<typeof parseBin>> => p !== null && p.row === row)
    .map((p) => p.pos)

  if (positions.length === 0) return null
  return { min: Math.min(...positions), max: Math.max(...positions) }
}

/** Count rejected bins (those that don't parse). */
function countRejected(bins: string[]): number {
  return bins.filter((b) => parseBin(b) === null).length
}

export function BinPicker({ availableBins, report, onStart }: BinPickerProps) {
  const [from, setFrom] = useState('A1')
  const [to, setTo] = useState('A9')
  const [touched, setTouched] = useState(false)
  // Track which quick-pick row is active (null = none / manual entry).
  const [activeRow, setActiveRow] = useState<string | null>('A')

  const fromId = useId()
  const toId = useId()

  const fromParsed = parseBin(from)
  const toParsed = parseBin(to)
  const isValid = fromParsed !== null && toParsed !== null

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      setTouched(true)
      if (!isValid) return
      onStart({ from: from.trim().toUpperCase(), to: to.trim().toUpperCase() })
    },
    [isValid, from, to, onStart],
  )

  const setQuickPick = useCallback((row: string, fromBin: string, toBin: string) => {
    setFrom(fromBin)
    setTo(toBin)
    setTouched(false)
    setActiveRow(row)
  }, [])

  const rows = uniqueRows(availableBins)
  const totalRows = report?.rowsIn ?? availableBins.length
  const rejected = report ? report.rejected.length : countRejected(availableBins)
  const readable = report?.rowsOut ?? totalRows - rejected
  const binCount = new Set(availableBins.map((b) => b.trim().toUpperCase())).size

  return (
    <>
      {/* Responsive two-column grid: left = form (max 34rem), right = context */}
      <div
        style={{
          padding: 'var(--density)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 34rem) 1fr',
          gap: 'calc(var(--density) * 2)',
          alignItems: 'start',
        }}
        // Below 900px collapse to single column via inline media query workaround
        className="bin-picker-grid"
      >
        {/* ── Left: form panel ── */}
        <div style={{ fontFamily: 'var(--font-body)', color: 'var(--color-ink)' }}>

          {/* Page heading */}
          <div style={{ marginBottom: 'calc(var(--density) * 1.5)' }}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.25rem',
                margin: '0 0 0.4rem',
                color: 'var(--color-bone)',
              }}
            >
              Begin Stocktake
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                color: 'var(--color-muted)',
                margin: 0,
              }}
            >
              Select the bin range you will walk. Each entry in the range will be
              presented in turn for a physical count.
            </p>
          </div>

          {/* Quick-picks — one row, equal widths */}
          {rows.length > 0 && (
            <div style={{ marginBottom: 'var(--density)' }}>
              <span
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  color: 'var(--color-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '0.4rem',
                }}
              >
                Quick pick
              </span>
              <div
                style={{
                  display: 'flex',
                  gap: '0.4rem',
                }}
              >
                {rows.map((row) => {
                  const bounds = rowBounds(row, availableBins)
                  if (!bounds) return null
                  const fromBin = `${row}${bounds.min}`
                  const toBin = `${row}${bounds.max}`
                  const isActive = activeRow === row
                  return (
                    <button
                      key={row}
                      type="button"
                      aria-label={`Quick pick row ${row}: bins ${fromBin} to ${toBin}`}
                      aria-pressed={isActive}
                      onClick={() => setQuickPick(row, fromBin, toBin)}
                      style={{
                        flex: '1 1 0',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.07em',
                        padding: '0.35rem 0.4rem',
                        background: isActive ? 'var(--color-accent)' : 'transparent',
                        color: isActive ? 'var(--color-bg)' : 'var(--color-muted)',
                        border: `1px solid rgba(200, 186, 168, 0.25)`,
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        transition: 'background var(--motion-duration, 150ms) ease, color var(--motion-duration, 150ms) ease',
                      }}
                    >
                      Row {row}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Range form — 34rem max, inputs at 1.05rem mono */}
          <form onSubmit={handleSubmit} noValidate style={{ maxWidth: '34rem' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                gap: '0.5rem',
                alignItems: 'center',
                marginBottom: 'var(--density)',
              }}
            >
              {/* From bin */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label
                  htmlFor={fromId}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    color: 'var(--color-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                  }}
                >
                  From bin
                </label>
                <input
                  id={fromId}
                  type="text"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value.toUpperCase())
                    setTouched(false)
                    setActiveRow(null)
                  }}
                  placeholder="A1"
                  aria-invalid={touched && !fromParsed ? 'true' : undefined}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.05rem',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--color-surface)',
                    color: 'var(--color-ink)',
                    border: `1px solid ${touched && !fromParsed ? 'var(--color-danger)' : 'var(--color-bone)'}`,
                    borderRadius: 'var(--radius)',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Em-dash separator, vertically centred relative to inputs */}
              <span
                aria-hidden="true"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.05rem',
                  color: 'var(--color-muted)',
                  // Align to the input baseline, not the label
                  alignSelf: 'flex-end',
                  paddingBottom: '0.5rem',
                  userSelect: 'none',
                }}
              >
                —
              </span>

              {/* To bin */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label
                  htmlFor={toId}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    color: 'var(--color-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                  }}
                >
                  To bin
                </label>
                <input
                  id={toId}
                  type="text"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value.toUpperCase())
                    setTouched(false)
                    setActiveRow(null)
                  }}
                  placeholder="A9"
                  aria-invalid={touched && !toParsed ? 'true' : undefined}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.05rem',
                    padding: '0.5rem 0.75rem',
                    background: 'var(--color-surface)',
                    color: 'var(--color-ink)',
                    border: `1px solid ${touched && !toParsed ? 'var(--color-danger)' : 'var(--color-bone)'}`,
                    borderRadius: 'var(--radius)',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Validation message */}
            {touched && !isValid && (
              <p
                role="alert"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8125rem',
                  color: 'var(--color-danger)',
                  margin: '0 0 var(--density)',
                }}
              >
                Enter valid bin codes (letter + number, e.g. A1, B12).
              </p>
            )}

            <button
              type="submit"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.9rem',
                padding: '0.6rem 1.5rem',
                background: 'var(--color-accent)',
                color: 'var(--color-bg)',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Start walk →
            </button>
          </form>
        </div>

        {/* ── Right: context panel ── */}
        <aside
          style={{
            border: '1px solid var(--color-bone)',
            padding: 'var(--density)',
            fontFamily: 'var(--font-body)',
          }}
          className="bin-picker-context"
        >
          <h3
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--color-bone)',
              margin: '0 0 0.75rem',
            }}
          >
            About this walk
          </h3>

          <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', margin: '0 0 0.4rem', lineHeight: 1.5 }}>
            This ledger was acquired with the site. No one who worked the original
            stock system is available.
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', margin: '0 0 0.4rem', lineHeight: 1.5 }}>
            A physical count of every bin must be completed and reconciled against
            the dot-matrix printout before valuation can proceed.
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted)', margin: '0 0 1rem', lineHeight: 1.5 }}>
            Any discrepancy must be initialled by the checker. The count is the
            record of truth; the ledger is the question.
          </p>

          {/* Stats row */}
          <div
            style={{
              display: 'flex',
              gap: '1.5rem',
              borderTop: '1px solid rgba(200, 186, 168, 0.2)',
              paddingTop: '0.75rem',
              flexWrap: 'wrap',
            }}
          >
            <ContextStat label="Ledger rows" value={totalRows} />
            <ContextStat label="Readable" value={readable} />
            <ContextStat label="Rejected" value={rejected} danger={rejected > 0} />
            <ContextStat label="Bins" value={binCount} />
          </div>
        </aside>
      </div>

      {/* Responsive collapse: single column below 900px */}
      <style>{`
        @media (max-width: 900px) {
          .bin-picker-grid {
            grid-template-columns: 1fr !important;
          }
          .bin-picker-context {
            border-top: 1px solid var(--color-bone);
            border-left: none !important;
            border-right: none !important;
            border-bottom: none !important;
          }
        }
      `}</style>
    </>
  )
}

function ContextStat({
  label,
  value,
  danger,
}: {
  label: string
  value: number
  danger?: boolean
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--color-muted)',
          marginBottom: '0.1rem',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '1.1rem',
          fontVariantNumeric: 'tabular-nums',
          color: danger ? 'var(--color-danger)' : 'var(--color-ink)',
        }}
      >
        {value}
      </div>
    </div>
  )
}
