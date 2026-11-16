/**
 * StocktakeSummary — the view-and-export screen shown after a walk completes.
 *
 * Shows the full discrepancy list (or a "clean" notice), export buttons, and
 * a print-friendly stocktake sheet (triggered via window.print()).
 *
 * The kit's Report component is embedded below the discrepancy table so the
 * Resurrection Report is always reachable from this screen in one click.
 *
 * Greenbar effect: alternating row background at 4% bone opacity on the
 * discrepancy table.
 *
 * No new kit components are forked — Report is imported directly.
 */

import React, { useCallback } from 'react'
import { Report } from '@reliquary/kit/ui'
import type { ResurrectionReport } from '@reliquary/kit/contract'
import type { StocktakeSession, CheckedItem } from './types.js'
import { computeTally } from './types.js'
import { downloadCombinedCsv, discrepancies } from './export.js'

interface StocktakeSummaryProps {
  session: StocktakeSession
  report: ResurrectionReport
  onNewWalk(): void
}

export function StocktakeSummary({ session, report, onNewWalk }: StocktakeSummaryProps) {
  const tally = computeTally(session.checked)
  const disc = discrepancies(session.checked)

  const handleExport = useCallback(() => {
    downloadCombinedCsv(session, report)
  }, [session, report])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const checkedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div
      style={{
        padding: 'var(--density)',
        fontFamily: 'var(--font-body)',
        color: 'var(--color-ink)',
      }}
    >
      {/* Back link */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: 'var(--density)' }}>
        <button
          type="button"
          onClick={onNewWalk}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            color: 'var(--color-accent)',
            padding: 0,
          }}
        >
          ← New walk
        </button>
      </nav>

      {/* Heading row + action buttons */}
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
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.375rem',
            margin: 0,
            color: 'var(--color-bone)',
          }}
        >
          Stocktake Report
        </h1>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <ActionButton onClick={handlePrint} label="⎙ Print sheet" />
          <ActionButton onClick={handleExport} label="↓ Export CSV" />
        </div>
      </div>

      {/* Meta */}
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8125rem',
          color: 'var(--color-muted)',
          margin: '0 0 var(--density)',
        }}
      >
        Bins {session.binRange.from}–{session.binRange.to} · {tally.checked} items · {checkedDate}
      </p>

      {/* Tally summary */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: 'var(--density)',
        }}
      >
        <SummaryCount label="Checked" value={tally.checked} />
        <SummaryCount label="Matched" value={tally.matched} accent />
        <SummaryCount label="Discrepant" value={tally.discrepant} danger={tally.discrepant > 0} />
      </div>

      {/* Printable stocktake sheet (always in DOM, hidden on screen via media query) */}
      <PrintableSheet session={session} disc={disc} checkedDate={checkedDate} />

      {/* Discrepancy table */}
      <DiscrepancyTable disc={disc} />

      {/* Resurrection Report */}
      <section
        style={{
          marginTop: 'calc(var(--density) * 2)',
          borderTop: '1px solid var(--color-bone)',
          paddingTop: 'var(--density)',
        }}
      >
        <Report report={report} />
      </section>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ActionButton({ onClick, label }: { onClick(): void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.8125rem',
        padding: '0.35rem 0.75rem',
        background: 'var(--color-surface)',
        color: 'var(--color-muted)',
        border: '1px solid var(--color-bone)',
        borderRadius: 'var(--radius)',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--color-ink)'
        e.currentTarget.style.borderColor = 'var(--color-accent)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--color-muted)'
        e.currentTarget.style.borderColor = 'var(--color-bone)'
      }}
    >
      {label}
    </button>
  )
}

function SummaryCount({
  label,
  value,
  accent,
  danger,
}: {
  label: string
  value: number
  accent?: boolean
  danger?: boolean
}) {
  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--color-bone)',
        minWidth: '7rem',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--color-muted)',
          marginBottom: '0.25rem',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '1.75rem',
          fontVariantNumeric: 'tabular-nums',
          color: danger
            ? 'var(--color-danger)'
            : accent
              ? 'var(--color-accent)'
              : 'var(--color-ink)',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function DiscrepancyTable({ disc }: { disc: CheckedItem[] }) {
  if (disc.length === 0) {
    return (
      <section aria-labelledby="disc-heading">
        <h2
          id="disc-heading"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            color: 'var(--color-bone)',
            margin: '0 0 0.5rem',
          }}
        >
          Discrepancies
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            color: 'var(--color-muted)',
            fontStyle: 'italic',
            margin: 0,
          }}
        >
          None — all items reconcile with the ledger.
        </p>
      </section>
    )
  }

  return (
    <section aria-labelledby="disc-heading">
      <h2
        id="disc-heading"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1rem',
          color: 'var(--color-bone)',
          margin: '0 0 0.5rem',
        }}
      >
        Discrepancies ({disc.length})
      </h2>
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
          }}
        >
          <thead>
            <tr>
              {(['Part No', 'Bin', 'Description', 'Ledger', 'Counted', 'Δ', 'Note', 'By'] as const).map((h) => (
                <th
                  key={h}
                  scope="col"
                  style={{
                    textAlign: 'left',
                    padding: '0.4rem 0.5rem',
                    color: 'var(--color-muted)',
                    borderBottom: '1px solid var(--color-bone)',
                    fontWeight: 'normal',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {disc.map((item, idx) => {
              if (item.outcome.kind !== 'discrepant') return null
              const delta = item.outcome.counted - item.entry.qty
              return (
                <tr
                  key={item.entry.partNo}
                  style={{
                    // Greenbar: alternating 4% bone opacity
                    background: idx % 2 === 0 ? 'rgba(200, 186, 168, 0.04)' : 'transparent',
                  }}
                >
                  <td style={tdStyle}>{item.entry.partNo}</td>
                  <td style={tdStyle}>{item.entry.bin}</td>
                  <td style={{ ...tdStyle, color: 'var(--color-ink)', maxWidth: '16rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.entry.description}
                  </td>
                  <td style={{ ...tdStyle, fontVariantNumeric: 'tabular-nums' }}>{item.entry.qty}</td>
                  <td style={{ ...tdStyle, fontVariantNumeric: 'tabular-nums' }}>{item.outcome.counted}</td>
                  <td
                    style={{
                      ...tdStyle,
                      color: delta < 0 ? 'var(--color-danger)' : 'var(--color-accent)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {delta > 0 ? '+' : ''}{delta}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--color-ink)' }}>{item.outcome.note}</td>
                  <td style={tdStyle}>{item.outcome.initials}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const tdStyle: React.CSSProperties = {
  padding: '0.4rem 0.5rem',
  color: 'var(--color-muted)',
}

// ── PrintableSheet ────────────────────────────────────────────────────────────
// Hidden on screen. The print stylesheet in index.html targets .print-stocktake-sheet.

function PrintableSheet({
  session,
  disc,
  checkedDate,
}: {
  session: StocktakeSession
  disc: CheckedItem[]
  checkedDate: string
}) {
  const tally = computeTally(session.checked)

  return (
    <div
      className="print-stocktake-sheet"
      style={{ display: 'none' }} // shown only by print media query in index.html
    >
      {/* Sheet header */}
      <div className="print-sheet__header">
        <h1 className="print-sheet__title">Stocktake Sheet</h1>
        <div className="print-sheet__meta">
          <span>Bins {session.binRange.from}–{session.binRange.to}</span>
          <span>Date: {checkedDate}</span>
          <span>{tally.checked} items checked</span>
        </div>
      </div>

      {/* All checked items */}
      <table className="print-sheet__all-items">
        <thead>
          <tr>
            <th>Part No</th>
            <th>Bin</th>
            <th>Description</th>
            <th>Vehicle</th>
            <th>Ledger</th>
            <th>Counted</th>
            <th>Δ</th>
            <th>Note</th>
            <th>By</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(session.checked.values()).map((item, idx) => {
            const outcome = item.outcome
            const isDisc = outcome.kind === 'discrepant'
            const counted = outcome.kind === 'discrepant' ? outcome.counted : item.entry.qty
            const delta = outcome.kind === 'discrepant' ? counted - item.entry.qty : 0
            const note = outcome.kind === 'discrepant' ? outcome.note : ''
            const initials = outcome.kind === 'discrepant' ? outcome.initials : ''
            return (
              <tr
                key={item.entry.partNo}
                className={[
                  isDisc ? 'print-row--discrepant' : '',
                  idx % 2 === 0 ? 'print-row--even' : '',
                ].filter(Boolean).join(' ')}
              >
                <td>{item.entry.partNo}</td>
                <td>{item.entry.bin}</td>
                <td>{item.entry.description}</td>
                <td>{item.entry.vehicle}</td>
                <td>{item.entry.qty}</td>
                <td>{counted}</td>
                <td>{isDisc ? (delta > 0 ? `+${delta}` : String(delta)) : ''}</td>
                <td>{note}</td>
                <td>{initials}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Summary footer — bin range, date, signature lines */}
      <div className="print-sheet__footer">
        <div className="print-sheet__footer-left">
          <p>Bins: {session.binRange.from}–{session.binRange.to} · Date: {checkedDate}</p>
          <p>Matched: {tally.matched} · Discrepant: {tally.discrepant}</p>
        </div>
        <div className="print-sheet__footer-right">
          <p>Checker: _______________________</p>
          <p>Signature: _______________________</p>
        </div>
      </div>
    </div>
  )
}
