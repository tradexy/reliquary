/**
 * Search screen — the landing state of every Reliquary app.
 *
 * The query lives in the URL as `?q=`. Typing updates the URL immediately so
 * every result state is linkable. The result list is a plain ordered list of
 * anchor elements so it is keyboard-navigable without custom JS.
 *
 * Empty state is intentional: a zero-result message, not a blank page.
 *
 * Layout: a single bordered container, 1px dividers between rows, no card
 * gaps. Hover/focus shows surface background and a 2px accent left border.
 */

import React, { useCallback } from 'react'
import type { Repository } from '../repository/memory.js'
import type { RecordSummary } from './types.js'
import type { ResurrectionReport } from '../contract/types.js'

interface SearchProps<T extends object> {
  /** Pre-built repository for the current dataset. */
  repository: Repository<T>
  /**
   * Current query value — read from `?q=` by the router and passed down so
   * this component remains controlled and URL-driven.
   */
  query: string
  /** Called when the user changes the input; parent updates the URL. */
  onQueryChange(query: string): void
  /**
   * Produce a three-part summary for one record. Replaces the former
   * renderResult callback so the kit can own the row layout and truncation.
   */
  renderSummary(record: T): RecordSummary
  /** Derive the unique id from a record (matches the Repository's idField). */
  getId(record: T): string
  /** Report to display in the status strip above the search field. */
  report: ResurrectionReport
}

export function Search<T extends object>({
  repository,
  query,
  onQueryChange,
  renderSummary,
  getId,
  report,
}: SearchProps<T>) {
  const results = repository.search(query)
  const total = repository.all().length

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onQueryChange(e.target.value)
    },
    [onQueryChange],
  )

  const resultLabel =
    query.trim() === ''
      ? `${total} record${total === 1 ? '' : 's'}`
      : `${results.length} of ${total} record${total === 1 ? '' : 's'}`

  return (
    <div className="search-screen" style={{ padding: 'var(--density) 0' }}>
      {/* Resurrection report status strip ──────────────────────────────── */}
      <ReportStrip report={report} />

      {/* Search input ─────────────────────────────────────────────────── */}
      <div
        className="search-field"
        style={{
          marginBottom: '0.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          maxWidth: '48rem',
        }}
      >
        <label
          htmlFor="reliquary-search"
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-muted)',
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Search
        </label>
        <input
          id="reliquary-search"
          type="search"
          role="searchbox"
          aria-label="Search records"
          autoComplete="off"
          value={query}
          onChange={handleChange}
          placeholder="Type to filter…"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1.05rem',
            padding: '0.8rem',
            background: 'var(--color-surface)',
            color: 'var(--color-ink)',
            border: '1px solid rgba(212,201,168,0.25)',
            borderRadius: 'var(--radius)',
            outline: 'none',
            width: '100%',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => {
            e.currentTarget.style.outlineOffset = '2px'
            e.currentTarget.style.outline = '2px solid var(--color-accent)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none'
          }}
        />
      </div>

      {/* Result count ─────────────────────────────────────────────────── */}
      <p
        aria-live="polite"
        aria-atomic="true"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8125rem',
          color: 'var(--color-muted)',
          margin: '0 0 var(--density)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {resultLabel}
      </p>

      {/* Result list ──────────────────────────────────────────────────── */}
      {results.length === 0 ? (
        <EmptyState query={query} />
      ) : (
        /* Single bordered container; rows separated by 1px dividers */
        <ol
          aria-label="Search results"
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            border: '1px solid rgba(212,201,168,0.18)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
          }}
        >
          {results.map((record, index) => {
            const id = getId(record)
            const summary = renderSummary(record)
            const isLast = index === results.length - 1
            return (
              <li
                key={id}
                style={{
                  borderBottom: isLast ? 'none' : '1px solid rgba(212,201,168,0.12)',
                }}
              >
                <ResultRow id={id} summary={summary} />
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

function ResultRow({ id, summary }: { id: string; summary: RecordSummary }) {
  const setHover = (el: HTMLAnchorElement, on: boolean) => {
    el.style.background = on ? 'var(--color-surface)' : 'transparent'
    el.style.borderLeftColor = on ? 'var(--color-accent)' : 'transparent'
  }

  return (
    <a
      href={`?id=${encodeURIComponent(id)}`}
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: '0.75rem',
        padding: '0.85rem var(--density)',
        background: 'transparent',
        color: 'var(--color-ink)',
        textDecoration: 'none',
        fontFamily: 'var(--font-body)',
        borderLeft: '2px solid transparent',
        transition:
          'background var(--motion-duration, 150ms) ease, border-color var(--motion-duration, 150ms) ease',
        overflow: 'hidden',
        outline: 'none',
      }}
      onFocus={(e) => {
        setHover(e.currentTarget, true)
        e.currentTarget.style.outlineOffset = '-2px'
        e.currentTarget.style.outline = '2px solid var(--color-accent)'
      }}
      onBlur={(e) => {
        setHover(e.currentTarget, false)
        e.currentTarget.style.outline = 'none'
      }}
      onMouseEnter={(e) => setHover(e.currentTarget, true)}
      onMouseLeave={(e) => setHover(e.currentTarget, false)}
    >
      {/* Primary + secondary stack */}
      <div style={{ flex: '1 1 0', minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1.05rem',
            color: 'var(--color-ink)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {summary.primary}
        </div>
        {summary.secondary !== undefined && (
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.875rem',
              color: 'var(--color-muted)',
              marginTop: '0.1rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {summary.secondary}
          </div>
        )}
      </div>
      {/* Meta — right-aligned mono tabular */}
      {summary.meta !== undefined && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            color: 'var(--color-muted)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {summary.meta}
        </div>
      )}
    </a>
  )
}

function EmptyState({ query }: { query: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        padding: '2rem var(--density)',
        textAlign: 'center',
        color: 'var(--color-muted)',
        fontFamily: 'var(--font-body)',
        fontStyle: 'italic',
      }}
    >
      {query.trim() === ''
        ? 'No records in this repository.'
        : `No records match "${query}".`}
    </div>
  )
}

function ReportStrip({ report }: { report: ResurrectionReport }) {
  const isLossless = report.status === 'lossless'

  return (
    <div
      aria-label="Resurrection report summary"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        flexWrap: 'wrap',
        marginBottom: '0.75rem',
        padding: '0.5rem 0.75rem',
        background: 'var(--color-surface)',
        border: '1px solid rgba(212,201,168,0.18)',
        borderRadius: 'var(--radius)',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
      }}
    >
      {/* Label */}
      <span
        style={{
          color: 'var(--color-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        Resurrection report
      </span>

      {/* Counts */}
      <span
        style={{
          color: 'var(--color-ink)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {report.rowsIn} in · {report.rowsOut} out · {report.rejected.length} rejected
      </span>

      {/* Status pill */}
      <span
        style={{
          padding: '0.15rem 0.55rem',
          borderRadius: '999px',
          border: `1px solid ${isLossless ? 'var(--color-accent)' : 'var(--color-danger)'}`,
          color: isLossless ? 'var(--color-accent)' : 'var(--color-danger)',
          fontSize: '0.7rem',
          fontWeight: 'bold',
          letterSpacing: '0.06em',
        }}
      >
        {isLossless ? 'LOSSLESS' : 'INCONSISTENT'}
      </span>

      {/* View report link */}
      <a
        href="?view=report"
        style={{
          color: 'var(--color-accent)',
          textDecoration: 'none',
          marginLeft: 'auto',
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
        View report
      </a>
    </div>
  )
}
