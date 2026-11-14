/**
 * Search screen — the landing state of every Reliquary app.
 *
 * The query lives in the URL as `?q=`. Typing updates the URL immediately so
 * every result state is linkable. The result list is a plain ordered list of
 * anchor elements so it is keyboard-navigable without custom JS.
 *
 * Empty state is intentional: a zero-result message, not a blank page.
 */

import React, { useCallback } from 'react'
import type { Repository } from '../repository/memory.js'

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
   * Render one result row. Receives the record and must return a React node.
   * The shell wraps it in an `<li>` with a navigable anchor; the app supplies
   * the content.
   */
  renderResult(record: T, id: string): React.ReactNode
  /** Derive the unique id from a record (matches the Repository's idField). */
  getId(record: T): string
}

export function Search<T extends object>({
  repository,
  query,
  onQueryChange,
  renderResult,
  getId,
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
    <div className="search-screen" style={{ padding: 'var(--density)' }}>
      {/* Search input ─────────────────────────────────────────────────── */}
      <div
        className="search-field"
        style={{
          marginBottom: 'var(--density)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        <label
          htmlFor="reliquary-search"
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-muted)',
            fontSize: '0.875rem',
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
            fontSize: '1rem',
            padding: '0.5rem 0.75rem',
            background: 'var(--color-surface)',
            color: 'var(--color-ink)',
            border: '1px solid var(--color-bone)',
            borderRadius: 'var(--radius)',
            outline: 'none',
            width: '100%',
            boxSizing: 'border-box',
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
        }}
      >
        {resultLabel}
      </p>

      {/* Result list ──────────────────────────────────────────────────── */}
      {results.length === 0 ? (
        <EmptyState query={query} />
      ) : (
        <ol
          aria-label="Search results"
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          {results.map((record) => {
            const id = getId(record)
            return (
              <li key={id}>
                <a
                  href={`?id=${encodeURIComponent(id)}`}
                  style={{
                    display: 'block',
                    padding: 'var(--density)',
                    background: 'var(--color-surface)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid transparent',
                    color: 'var(--color-ink)',
                    textDecoration: 'none',
                    fontFamily: 'var(--font-body)',
                    transition: 'border-color 150ms ease',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-accent)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-accent)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent'
                  }}
                >
                  {renderResult(record, id)}
                </a>
              </li>
            )
          })}
        </ol>
      )}
    </div>
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
