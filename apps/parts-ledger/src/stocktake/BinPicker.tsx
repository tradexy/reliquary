/**
 * BinPicker — the landing screen for the Parts Ledger.
 *
 * The primary interaction is a stocktake walk, so the first question is
 * always "which bin range?" — not "what are you searching for?".
 *
 * The form accepts two bin codes (from / to) and starts the walk on submit.
 * Quick-pick buttons populate common row ranges so a yard foreman can begin
 * immediately without typing.
 *
 * Valid bin codes are letter(s) + number, e.g. A1, B12, D9.
 * The picker validates both inputs before enabling the Start button.
 */

import React, { useState, useCallback, useId } from 'react'
import { parseBin } from './types.js'
import type { BinRange } from './types.js'

interface BinPickerProps {
  /** Available bin codes from the loaded repository (used for quick-picks). */
  availableBins: string[]
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

export function BinPicker({ availableBins, onStart }: BinPickerProps) {
  const [from, setFrom] = useState('A1')
  const [to, setTo] = useState('A9')
  const [touched, setTouched] = useState(false)

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

  const setQuickPick = useCallback((fromBin: string, toBin: string) => {
    setFrom(fromBin)
    setTo(toBin)
    setTouched(false)
  }, [])

  const rows = uniqueRows(availableBins)

  return (
    <div
      style={{
        padding: 'var(--density)',
        fontFamily: 'var(--font-body)',
        color: 'var(--color-ink)',
        maxWidth: '36rem',
      }}
    >
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

      {/* Quick-picks */}
      {rows.length > 0 && (
        <div style={{ marginBottom: 'var(--density)' }}>
          <span
            style={{
              display: 'block',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--color-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: '0.4rem',
            }}
          >
            Quick pick
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {rows.map((row) => {
              const bounds = rowBounds(row, availableBins)
              if (!bounds) return null
              const fromBin = `${row}${bounds.min}`
              const toBin = `${row}${bounds.max}`
              return (
                <button
                  key={row}
                  type="button"
                  aria-label={`Quick pick row ${row}: bins ${fromBin} to ${toBin}`}
                  onClick={() => setQuickPick(fromBin, toBin)}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8125rem',
                    padding: '0.3rem 0.7rem',
                    background: 'var(--color-surface)',
                    color: 'var(--color-muted)',
                    border: '1px solid var(--color-bone)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-accent)'
                    e.currentTarget.style.color = 'var(--color-ink)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-bone)'
                    e.currentTarget.style.color = 'var(--color-muted)'
                  }}
                >
                  Row {row}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Range form */}
      <form onSubmit={handleSubmit} noValidate>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gap: '0.5rem',
            alignItems: 'end',
            marginBottom: 'var(--density)',
          }}
        >
          {/* From bin */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <label
              htmlFor={fromId}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
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
              onChange={(e) => { setFrom(e.target.value.toUpperCase()); setTouched(false) }}
              placeholder="A1"
              aria-invalid={touched && !fromParsed ? 'true' : undefined}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1rem',
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

          {/* Separator */}
          <span
            aria-hidden="true"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1rem',
              color: 'var(--color-muted)',
              paddingBottom: '0.5rem',
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
                fontSize: '0.75rem',
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
              onChange={(e) => { setTo(e.target.value.toUpperCase()); setTouched(false) }}
              placeholder="A9"
              aria-invalid={touched && !toParsed ? 'true' : undefined}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1rem',
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
  )
}
