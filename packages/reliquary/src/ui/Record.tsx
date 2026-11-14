/**
 * Record screen — displays a single domain record.
 *
 * The record is broken into sections of label/value pairs supplied by the
 * app's `renderRecord` function. The kit never inspects domain fields directly.
 *
 * A provenance disclosure section is always rendered at the bottom, showing
 * the source name and import timestamp from the ResurrectionReport. This is
 * non-negotiable: users must always be able to trace where a record came from.
 *
 * Navigation: a "Back to search" link returns to `?q=` preserving the previous
 * query, and the record's id is kept in the URL as `?id=` so the page is
 * directly linkable.
 */

import React, { useState } from 'react'
import type { RecordSection } from './types.js'
import type { ResurrectionReport } from '../contract/types.js'

interface RecordProps {
  /** Sections returned by the app's renderRecord(). */
  sections: RecordSection[]
  /** The ResurrectionReport for provenance disclosure. */
  report: ResurrectionReport
  /** Query string to restore when navigating back. */
  returnQuery: string
}

export function Record({ sections, report, returnQuery }: RecordProps) {
  const backHref = returnQuery.trim() !== '' ? `?q=${encodeURIComponent(returnQuery)}` : '/'

  return (
    <article
      style={{
        padding: 'var(--density)',
        fontFamily: 'var(--font-body)',
        color: 'var(--color-ink)',
      }}
    >
      {/* Back link ──────────────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: 'var(--density)' }}>
        <a
          href={backHref}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            color: 'var(--color-accent)',
            textDecoration: 'none',
          }}
          aria-label="Back to search results"
        >
          ← Back
        </a>
      </nav>

      {/* Record sections ─────────────────────────────────────────────────── */}
      {sections.map((section) => (
        <FieldSection key={section.heading} section={section} />
      ))}

      {/* Provenance disclosure — always rendered ─────────────────────────── */}
      <ProvenanceDisclosure report={report} />
    </article>
  )
}

function FieldSection({ section }: { section: RecordSection }) {
  return (
    <section
      aria-labelledby={`section-${section.heading}`}
      style={{
        marginBottom: 'calc(var(--density) * 1.5)',
        padding: 'var(--density)',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--color-bone)',
      }}
    >
      <h2
        id={`section-${section.heading}`}
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.875rem',
          color: 'var(--color-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          margin: '0 0 0.75rem',
        }}
      >
        {section.heading}
      </h2>
      <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem' }}>
        {section.fields.map((field) => (
          <React.Fragment key={field.label}>
            <dt
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: 'var(--color-muted)',
                alignSelf: 'baseline',
                whiteSpace: 'nowrap',
              }}
            >
              {field.label}
            </dt>
            <dd
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '1rem',
                color: field.value == null ? 'var(--color-muted)' : 'var(--color-ink)',
                fontStyle: field.value == null ? 'italic' : 'normal',
                margin: 0,
              }}
            >
              {field.value == null ? 'not recorded' : String(field.value)}
            </dd>
          </React.Fragment>
        ))}
      </dl>
    </section>
  )
}

/**
 * Provenance disclosure — a collapsible `<details>` element.
 *
 * Always present in the DOM (accessible to screen readers), collapsed by
 * default to reduce visual noise. The summary text is always visible and
 * reads as a complete sentence so it is meaningful without expanding.
 */
function ProvenanceDisclosure({ report }: { report: ResurrectionReport }) {
  const [open, setOpen] = useState(false)

  const formatted = new Date(report.importedAt).toLocaleString(undefined, {
    dateStyle: 'long',
    timeStyle: 'short',
  })

  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      style={{
        borderTop: '1px solid var(--color-bone)',
        paddingTop: 'var(--density)',
        marginTop: 'var(--density)',
      }}
    >
      <summary
        aria-expanded={open}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          color: 'var(--color-muted)',
          cursor: 'pointer',
          listStyle: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
        }}
      >
        <span aria-hidden="true">{open ? '▾' : '▸'}</span>
        Provenance — imported from {report.sourceName}
      </summary>

      <div
        role="region"
        aria-label="Provenance details"
        style={{
          marginTop: '0.75rem',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '0.4rem 1rem',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          color: 'var(--color-muted)',
        }}
      >
        <span>Source</span>
        <span style={{ color: 'var(--color-ink)' }}>{report.sourceName}</span>
        <span>Imported</span>
        <span style={{ color: 'var(--color-ink)' }}>
          <time dateTime={report.importedAt}>{formatted}</time>
        </span>
        <span>Status</span>
        <span
          style={{
            color:
              report.status === 'lossless' ? 'var(--color-accent)' : 'var(--color-danger)',
            fontWeight: 'bold',
          }}
        >
          {report.status}
        </span>
      </div>
    </details>
  )
}
