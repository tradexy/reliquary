/**
 * App shell — routing and theme injection.
 *
 * Routes are URL-driven, no router library required:
 *
 *   /           ?q=<query>   → Search screen
 *   /           ?id=<id>     → Record screen
 *   /report                  → Report screen
 *
 * The shell reads window.location on every render. This is correct for a
 * static single-page app: the browser handles navigation via <a href="…">
 * and the page re-mounts on popstate (apps wire this up in their entry point).
 *
 * Theme tokens are injected as CSS custom properties on the root element
 * once at mount and updated whenever the theme prop changes.
 */

import React, { useEffect, useCallback, useState } from 'react'
import type { AppConfig } from './types.js'
import type { Repository } from '../repository/memory.js'
import { themeToProperties } from './theme.js'
import { Search } from './Search.js'
import { Record } from './Record.js'
import { Report } from './Report.js'

interface AppProps<T extends object> {
  config: AppConfig<T>
  repository: Repository<T>
  /** Derive the unique string id from a record. Must match the idField used at Repository construction. */
  getId(record: T): string
  /**
   * Injected for testability. In production apps this is `window.location`.
   * Tests pass a plain object with `pathname` and `search`.
   */
  location?: { pathname: string; search: string }
}

/** Minimal route description derived from the URL. */
type Route =
  | { screen: 'search'; query: string }
  | { screen: 'record'; id: string; returnQuery: string }
  | { screen: 'report' }

function parseRoute(location: { pathname: string; search: string }): Route {
  const params = new URLSearchParams(location.search)

  // /report  (exact match, no query params needed)
  if (location.pathname.endsWith('/report')) {
    return { screen: 'report' }
  }

  // /?id=<id>
  const id = params.get('id')
  if (id !== null) {
    return { screen: 'record', id, returnQuery: params.get('q') ?? '' }
  }

  // / or /?q=<query>
  return { screen: 'search', query: params.get('q') ?? '' }
}

export function App<T extends object>({
  config,
  repository,
  getId,
  location: injectedLocation,
}: AppProps<T>) {
  // Re-render on popstate so back/forward navigation updates the view.
  const [locationState, setLocationState] = useState(() =>
    injectedLocation ?? { pathname: window.location.pathname, search: window.location.search },
  )

  useEffect(() => {
    if (injectedLocation) return // test mode — caller controls location

    const onPopState = () => {
      setLocationState({ pathname: window.location.pathname, search: window.location.search })
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [injectedLocation])

  // Inject theme tokens on mount and whenever theme changes.
  useEffect(() => {
    const props = themeToProperties(config.theme)
    const root = document.documentElement
    root.setAttribute('data-theme', config.theme.name)
    for (const [prop, value] of Object.entries(props)) {
      root.style.setProperty(prop, value)
    }
  }, [config.theme])

  // Respect prefers-reduced-motion: inject a flag so components can read it.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = (reduced: boolean) => {
      document.documentElement.style.setProperty(
        '--motion-duration',
        reduced ? '0ms' : '150ms',
      )
    }
    apply(mq.matches)
    const handler = (e: MediaQueryListEvent) => apply(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Push a new URL without full navigation, then update internal state.
  const navigate = useCallback(
    (search: string) => {
      if (injectedLocation) return // test mode — no real navigation
      const url = new URL(window.location.href)
      url.search = search
      window.history.pushState({}, '', url)
      setLocationState({ pathname: url.pathname, search: url.search })
    },
    [injectedLocation],
  )

  const handleQueryChange = useCallback(
    (query: string) => {
      navigate(query.trim() !== '' ? `?q=${encodeURIComponent(query)}` : '/')
    },
    [navigate],
  )

  const route = parseRoute(locationState)

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        color: 'var(--color-ink)',
      }}
    >
      <AppHeader title={config.title} subtitle={config.subtitle} />

      <main id="main-content">
        {route.screen === 'report' && <Report report={repository.report()} />}

        {route.screen === 'record' && (() => {
          const record = repository.byId(route.id)
          if (record === undefined) {
            return <RecordNotFound id={route.id} returnQuery={route.returnQuery} />
          }
          return (
            <Record
              sections={config.renderRecord(record)}
              report={repository.report()}
              returnQuery={route.returnQuery}
            />
          )
        })()}

        {route.screen === 'search' && (
          <Search
            repository={repository}
            query={route.query}
            onQueryChange={handleQueryChange}
            renderSummary={(record) => config.renderSummary(record)}
            getId={getId}
          />
        )}
      </main>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AppHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header
      style={{
        padding: 'calc(var(--density) * 1.5) var(--density)',
        borderBottom: '1px solid var(--color-bone)',
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
      }}
    >
      <div>
        <a
          href="/"
          style={{ textDecoration: 'none', color: 'inherit' }}
          aria-label={`${title} — go to search`}
        >
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.375rem',
              margin: 0,
              color: 'var(--color-bone)',
            }}
          >
            {title}
          </h1>
        </a>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            color: 'var(--color-muted)',
            margin: '0.2rem 0 0',
          }}
        >
          {subtitle}
        </p>
      </div>

      <nav aria-label="Site navigation">
        <a
          href="/report"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            color: 'var(--color-muted)',
            textDecoration: 'none',
          }}
          aria-label="View resurrection report"
        >
          Report
        </a>
      </nav>
    </header>
  )
}

function RecordNotFound({ id, returnQuery }: { id: string; returnQuery: string }) {
  const backHref = returnQuery.trim() !== '' ? `?q=${encodeURIComponent(returnQuery)}` : '/'
  return (
    <div
      role="alert"
      style={{
        padding: 'var(--density)',
        fontFamily: 'var(--font-body)',
        color: 'var(--color-muted)',
        fontStyle: 'italic',
      }}
    >
      <p>Record "{id}" was not found in this repository.</p>
      <a
        href={backHref}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8125rem',
          color: 'var(--color-accent)',
          textDecoration: 'none',
        }}
      >
        ← Back
      </a>
    </div>
  )
}
