/**
 * Record screen — displays a single domain record.
 *
 * The record is broken into sections of label/value pairs supplied by the
 * app's `renderRecord` function. The kit never inspects domain fields directly.
 *
 * Layout: an index card — a bordered panel with a ledger-rule top band holding
 * the shelfmark (first field of the first section) in mono, a 'CARD' stamp
 * right-aligned, and an optional app-supplied headerAction (e.g. print slip).
 * Fields are rendered as a definition list with dotted leaders between term
 * and value. Provenance is styled as a rubber stamp (dashed border, rotated).
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
  /**
   * Optional node rendered in the card top band. Apps use this for actions
   * (e.g. a print-slip button) so they don't need a floating overlay.
   */
  headerAction?: React.ReactNode
  /**
   * Optional identifier shown in mono in the top band (e.g. a shelfmark).
   * When omitted the band still renders for layout but carries no text.
   */
  shelfmark?: string
}

export function Record({ sections, report, returnQuery, headerAction, shelfmark }: RecordProps) {
  const backHref = returnQuery.trim() !== '' ? `?q=${encodeURIComponent(returnQuery)}` : '/'

  return (
    <article
      style={{
        padding: 'var(--density) 0',
        fontFamily: 'var(--font-body)',
        color: 'var(--color-ink)',
        maxWidth: '72ch',
        margin: '0 auto',
      }}
    >
      {/* Back link ──────────────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: 'calc(var(--density) * 0.75)' }}>
        <a
          href={backHref}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            color: 'var(--color-accent)',
            textDecoration: 'none',
            outline: 'none',
          }}
          aria-label="Back to search results"
          onFocus={(e) => {
            e.currentTarget.style.outlineOffset = '2px'
            e.currentTarget.style.outline = '2px solid var(--color-accent)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none'
          }}
        >
          ← Back
        </a>
      </nav>

      {/* Index card ──────────────────────────────────────────────────────── */}
      <div
        style={{
          border: '1px solid rgba(212,201,168,0.25)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
        }}
      >
        {/* Ledger-rule top band ───────────────────────────────────────────── */}
        <div
          style={{
            background: 'var(--color-surface)',
            borderBottom: '1px solid rgba(212,201,168,0.25)',
            padding: '0.6rem var(--density)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8125rem',
              color: 'var(--color-bone)',
              letterSpacing: '0.04em',
            }}
          >
            {shelfmark}
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            {headerAction}
            <span
              aria-hidden="true"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                color: 'var(--color-muted)',
                letterSpacing: '0.12em',
                border: '1px solid rgba(212,201,168,0.3)',
                padding: '0.15rem 0.4rem',
                borderRadius: '1px',
                opacity: 0.7,
              }}
            >
              CARD
            </span>
          </div>
        </div>

        {/* Body ───────────────────────────────────────────────────────────── */}
        <div
          style={{
            background: 'var(--color-surface)',
            padding: 'var(--density)',
          }}
        >
          {sections.map((section) => (
            <FieldSection key={section.heading} section={section} />
          ))}

          {/* Provenance disclosure — always rendered ───────────────────── */}
          <ProvenanceDisclosure report={report} />
        </div>
      </div>
    </article>
  )
}

function FieldSection({ section }: { section: RecordSection }) {
  return (
    <section
      aria-labelledby={`section-${section.heading}`}
      style={{ marginBottom: 'calc(var(--density) * 1.25)' }}
    >
      <h2
        id={`section-${section.heading}`}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          color: 'var(--color-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: '0 0 0.6rem',
        }}
      >
        {section.heading}
      </h2>
      {/* Definition list with dotted leaders */}
      <dl style={{ margin: 0 }}>
        {section.fields.map((field) => (
          <div
            key={field.label}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 0,
              marginBottom: '0.45rem',
            }}
          >
            <dt
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: 'var(--color-muted)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                paddingRight: '0.4rem',
              }}
            >
              {field.label}
            </dt>
            {/* Dotted leader line */}
            <span
              aria-hidden="true"
              style={{
                flex: 1,
                borderBottom: '1px dotted rgba(212,201,168,0.25)',
                marginBottom: '0.2em',
                minWidth: '1rem',
              }}
            />
            <dd
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '1rem',
                color: field.value == null ? 'var(--color-muted)' : 'var(--color-ink)',
                fontStyle: field.value == null ? 'italic' : 'normal',
                margin: 0,
                paddingLeft: '0.4rem',
                whiteSpace: 'normal',
                overflowWrap: 'anywhere',
                textAlign: 'right',
                maxWidth: '55ch',
              }}
            >
              {field.value == null ? 'not recorded' : String(field.value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/**
 * Provenance disclosure — styled as a rubber stamp.
 *
 * A collapsible `<details>` element, always present in the DOM. When expanded,
 * the detail block is styled with a dashed bone border and rotated -1deg to
 * suggest a physical stamp impression.
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
        borderTop: '1px solid rgba(212,201,168,0.18)',
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
          outline: 'none',
        }}
        onFocus={(e) => {
          e.currentTarget.style.outlineOffset = '2px'
          e.currentTarget.style.outline = '2px solid var(--color-accent)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = 'none'
        }}
      >
        <span aria-hidden="true">{open ? '▾' : '▸'}</span>
        Provenance — imported from {report.sourceName}
      </summary>

      {/* Rubber stamp block */}
      <div
        role="region"
        aria-label="Provenance details"
        style={{
          marginTop: '0.75rem',
          display: 'inline-block',
          border: '1px dashed rgba(212,201,168,0.35)',
          borderRadius: '1px',
          padding: '0.6rem 0.9rem',
          transform: 'rotate(-1deg)',
          transformOrigin: 'top left',
        }}
      >
        <div
          style={{
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
      </div>
    </details>
  )
}
