/**
 * Report screen — a first-class screen, not a console log.
 *
 * Shows:
 *   - Reconciliation badge: lossless (green) or inconsistent (danger, loud).
 *   - Counts: rowsIn, rowsOut, rejected.
 *   - Field mapping table.
 *   - Unmapped and synthesised field lists.
 *   - Rejected rows with their sourceRef and reason.
 *
 * An inconsistent report is impossible to miss: the badge is styled in the
 * danger colour, an alert role announces it to screen readers, and a prominent
 * warning message explains what it means.
 */

import React from 'react'
import type { ResurrectionReport } from '../contract/types.js'

interface ReportProps {
  report: ResurrectionReport
}

export function Report({ report }: ReportProps) {
  const isInconsistent = report.status === 'inconsistent'

  return (
    <div
      style={{
        padding: 'var(--density)',
        fontFamily: 'var(--font-body)',
        color: 'var(--color-ink)',
      }}
    >
      {/* Back link ──────────────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: 'var(--density)' }}>
        <a
          href="/"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            color: 'var(--color-accent)',
            textDecoration: 'none',
          }}
        >
          ← Back to search
        </a>
      </nav>

      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.5rem',
          margin: '0 0 var(--density)',
          color: 'var(--color-bone)',
        }}
      >
        Resurrection Report
      </h1>

      {/* Reconciliation badge ────────────────────────────────────────────── */}
      <ReconciliationBadge report={report} />

      {/* Inconsistency warning — only rendered when needed ───────────────── */}
      {isInconsistent && <InconsistencyWarning report={report} />}

      {/* Counts ──────────────────────────────────────────────────────────── */}
      <CountPanel report={report} />

      {/* Field mappings ──────────────────────────────────────────────────── */}
      {report.fieldMappings.length > 0 && <FieldMappingTable report={report} />}

      {/* Unmapped fields ─────────────────────────────────────────────────── */}
      {report.unmappedFields.length > 0 && <UnmappedFields report={report} />}

      {/* Synthesised fields ──────────────────────────────────────────────── */}
      {report.synthesisedFields.length > 0 && <SynthesisedFields report={report} />}

      {/* Rejected rows ───────────────────────────────────────────────────── */}
      <RejectedRows report={report} />
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ReconciliationBadge({ report }: ReportProps) {
  const isInconsistent = report.status === 'inconsistent'

  return (
    <div
      role={isInconsistent ? 'alert' : 'status'}
      aria-label={`Report status: ${report.status}`}
      data-status={report.status}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.4rem 0.9rem',
        marginBottom: 'var(--density)',
        borderRadius: 'var(--radius)',
        border: `2px solid ${isInconsistent ? 'var(--color-danger)' : 'var(--color-accent)'}`,
        background: 'var(--color-surface)',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.9rem',
        fontWeight: 'bold',
        color: isInconsistent ? 'var(--color-danger)' : 'var(--color-accent)',
      }}
    >
      <span aria-hidden="true">{isInconsistent ? '✕' : '✓'}</span>
      {report.status.toUpperCase()}
    </div>
  )
}

function InconsistencyWarning({ report }: ReportProps) {
  const delta = report.rowsIn - (report.rowsOut + report.rejected.length)

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        marginBottom: 'var(--density)',
        padding: 'var(--density)',
        background: 'var(--color-surface)',
        border: '2px solid var(--color-danger)',
        borderRadius: 'var(--radius)',
        color: 'var(--color-danger)',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.875rem',
      }}
    >
      <strong>Reconciliation failed.</strong>
      {' '}The source reported {report.rowsIn} row
      {report.rowsIn === 1 ? '' : 's'}, but only{' '}
      {report.rowsOut + report.rejected.length} row
      {report.rowsOut + report.rejected.length === 1 ? '' : 's'} were accounted
      for (delta: {delta > 0 ? '+' : ''}{delta}). This dataset must not be
      treated as authoritative until the adapter is corrected and re-imported.
    </div>
  )
}

function CountPanel({ report }: ReportProps) {
  const stats: Array<{ label: string; value: number; danger?: boolean }> = [
    { label: 'Rows in', value: report.rowsIn },
    { label: 'Rows out', value: report.rowsOut },
    { label: 'Rejected', value: report.rejected.length, danger: report.rejected.length > 0 },
  ]

  return (
    <div
      aria-label="Import counts"
      style={{
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        marginBottom: 'var(--density)',
      }}
    >
      {stats.map(({ label, value, danger }) => (
        <div
          key={label}
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
              fontSize: '0.75rem',
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
              fontWeight: 'bold',
              color: danger ? 'var(--color-danger)' : 'var(--color-ink)',
            }}
          >
            {value}
          </div>
        </div>
      ))}
    </div>
  )
}

function FieldMappingTable({ report }: ReportProps) {
  return (
    <section
      aria-labelledby="field-mappings-heading"
      style={{ marginBottom: 'var(--density)' }}
    >
      <h2
        id="field-mappings-heading"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1rem',
          color: 'var(--color-bone)',
          margin: '0 0 0.5rem',
        }}
      >
        Field Mappings
      </h2>
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
            {(['Source field', 'Normalised field'] as const).map((h) => (
              <th
                key={h}
                scope="col"
                style={{
                  textAlign: 'left',
                  padding: '0.4rem 0.75rem',
                  color: 'var(--color-muted)',
                  borderBottom: '1px solid var(--color-bone)',
                  fontWeight: 'normal',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {report.fieldMappings.map((m) => (
            <tr key={m.sourceField}>
              <td
                style={{
                  padding: '0.4rem 0.75rem',
                  color: 'var(--color-muted)',
                  borderBottom: '1px solid var(--color-surface)',
                }}
              >
                {m.sourceField}
              </td>
              <td
                style={{
                  padding: '0.4rem 0.75rem',
                  color: 'var(--color-ink)',
                  borderBottom: '1px solid var(--color-surface)',
                }}
              >
                {m.normalisedField}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function UnmappedFields({ report }: ReportProps) {
  return (
    <section
      aria-labelledby="unmapped-fields-heading"
      style={{ marginBottom: 'var(--density)' }}
    >
      <h2
        id="unmapped-fields-heading"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1rem',
          color: 'var(--color-bone)',
          margin: '0 0 0.5rem',
        }}
      >
        Unmapped Fields
      </h2>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        {report.unmappedFields.map((f) => (
          <li
            key={f}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8125rem',
              padding: '0.2rem 0.6rem',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-bone)',
              borderRadius: 'var(--radius)',
              color: 'var(--color-muted)',
            }}
          >
            {f}
          </li>
        ))}
      </ul>
    </section>
  )
}

function SynthesisedFields({ report }: ReportProps) {
  return (
    <section
      aria-labelledby="synthesised-fields-heading"
      style={{ marginBottom: 'var(--density)' }}
    >
      <h2
        id="synthesised-fields-heading"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1rem',
          color: 'var(--color-bone)',
          margin: '0 0 0.5rem',
        }}
      >
        Synthesised Fields
      </h2>
      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        {report.synthesisedFields.map((f) => (
          <li
            key={f}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8125rem',
              padding: '0.2rem 0.6rem',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-accent)',
              borderRadius: 'var(--radius)',
              color: 'var(--color-accent)',
            }}
          >
            {f}
          </li>
        ))}
      </ul>
    </section>
  )
}

function RejectedRows({ report }: ReportProps) {
  if (report.rejected.length === 0) {
    return (
      <section aria-labelledby="rejected-rows-heading">
        <h2
          id="rejected-rows-heading"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            color: 'var(--color-bone)',
            margin: '0 0 0.5rem',
          }}
        >
          Rejected Rows
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
          None — every row was accepted.
        </p>
      </section>
    )
  }

  return (
    <section aria-labelledby="rejected-rows-heading">
      <h2
        id="rejected-rows-heading"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1rem',
          color: 'var(--color-bone)',
          margin: '0 0 0.5rem',
        }}
      >
        Rejected Rows ({report.rejected.length})
      </h2>
      <ol
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        {report.rejected.map((r, i) => (
          <li
            key={`${r.sourceRef}-${i}`}
            style={{
              padding: '0.75rem',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius)',
              borderLeft: '3px solid var(--color-danger)',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8125rem',
                color: 'var(--color-ink)',
                marginBottom: '0.25rem',
              }}
            >
              {r.sourceRef}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                color: 'var(--color-muted)',
              }}
            >
              {r.reason}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
