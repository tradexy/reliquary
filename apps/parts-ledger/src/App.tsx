/**
 * Parts Ledger — app entry component.
 *
 * The Parts Ledger is task-first, not search-first. The landing screen is a
 * bin-range picker that starts a stocktake walk, not a search input.
 *
 * Screens:
 *   /           → BinPicker (landing: start a stocktake)
 *   /stocktake  → StocktakeScreen (walk through selected bin range)
 *   /summary    → StocktakeSummary (discrepancy list + exports)
 *   /?q=        → Search screen (via kit App — reachable from header)
 *   /?id=       → Record screen (via kit App)
 *   /report     → Report screen (via kit App)
 *
 * The kit's App shell handles the Search/Record/Report routing. The three
 * Parts-Ledger-specific screens (picker, walk, summary) are rendered as
 * siblings outside the kit shell and toggled by a simple in-memory state
 * machine — no router library required.
 *
 * Stocktake session state lives in React state for the duration of the
 * browser session. No localStorage. No server.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { App as ReliquaryApp } from '@reliquary/kit/ui'
import { foundry } from '@reliquary/kit/ui'
import { themeToProperties } from '@reliquary/kit/ui'
import type { AppConfig, RecordSection } from '@reliquary/kit/ui'
import { runPipeline } from '@reliquary/kit/import'
import { createRepository } from '@reliquary/kit/repository'
import type { Repository } from '@reliquary/kit/repository'
import type { ResurrectionReport } from '@reliquary/kit/contract'
import type { RawRow } from '@reliquary/kit/contract'
import { createLedgerSource } from './source/ledgerSource.js'
import type { LedgerEntry } from './source/ledgerSource.js'
import { BinPicker } from './stocktake/BinPicker.js'
import { StocktakeScreen } from './stocktake/StocktakeScreen.js'
import { StocktakeSummary } from './stocktake/StocktakeSummary.js'
import type { BinRange, StocktakeSession, CheckedItem } from './stocktake/types.js'
import { entriesInRange } from './stocktake/types.js'

import rawLedger from '../data/ledger.json'

const SOURCE_NAME = 'Redhill Motor Factors — Acquired Stock Ledger (dot-matrix export)'

/** Convert a LedgerEntry into sections for the kit Record screen. */
function renderRecord(entry: LedgerEntry): RecordSection[] {
  const pricePounds =
    entry.priceP !== null ? `£${(entry.priceP / 100).toFixed(2)}` : null

  return [
    {
      heading: 'Stock identity',
      fields: [
        { label: 'Part No', value: entry.partNo },
        { label: 'Bin', value: entry.bin },
        { label: 'Status', value: entry.status },
      ],
    },
    {
      heading: 'Description',
      fields: [
        { label: 'Description', value: entry.description },
        { label: 'Vehicle', value: entry.vehicle || null },
      ],
    },
    {
      heading: 'Stock figures',
      fields: [
        { label: 'Quantity', value: entry.qty },
        { label: 'Price', value: pricePounds },
        { label: 'Last moved', value: entry.lastMoved },
      ],
    },
  ]
}

const appConfig: AppConfig<LedgerEntry> = {
  title: 'Parts Ledger',
  subtitle: 'Redhill Motor Factors — acquired stock reconciliation',
  searchFields: ['partNo', 'description', 'vehicle', 'bin'],
  renderRecord,
  renderSummary(entry: LedgerEntry) {
    const primary = entry.description
    const vehicle = entry.vehicle.trim()
    const secondary = vehicle
      ? `Part ${entry.partNo} · ${vehicle}`
      : `Part ${entry.partNo}`
    const meta = `${entry.qty} in ${entry.bin}`
    return { primary, secondary, meta }
  },
  theme: foundry,
}

type LoadState =
  | { phase: 'loading' }
  | { phase: 'ready'; repository: Repository<LedgerEntry>; report: ResurrectionReport }
  | { phase: 'error'; message: string }

/** Which app screen is active. The kit App handles its own sub-routing. */
type AppScreen = 'kit' | 'picker' | 'walk' | 'summary'

/** Derive the current screen from the URL path. */
function screenFromPath(pathname: string): 'picker' | 'kit' {
  if (pathname === '/' || pathname === '') return 'picker'
  return 'kit'
}

export function App() {
  const [loadState, setLoadState] = useState<LoadState>({ phase: 'loading' })
  const [screen, setScreen] = useState<AppScreen>(() =>
    screenFromPath(window.location.pathname),
  )
  const [session, setSession] = useState<StocktakeSession | null>(null)

  // Apply foundry theme tokens on mount.
  useEffect(() => {
    const props = themeToProperties(foundry)
    const root = document.documentElement
    root.setAttribute('data-theme', foundry.name)
    for (const [prop, value] of Object.entries(props)) {
      root.style.setProperty(prop, value)
    }
  }, [])

  // Inject motion preference.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = (reduced: boolean) => {
      document.documentElement.style.setProperty('--motion-duration', reduced ? '0ms' : '150ms')
    }
    apply(mq.matches)
    const handler = (e: MediaQueryListEvent) => apply(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Load + run the pipeline once.
  useEffect(() => {
    const rows = rawLedger as RawRow[]
    const source = createLedgerSource(rows)

    runPipeline(source, SOURCE_NAME, new Date().toISOString())
      .then(({ report, records }) => {
        const repository = createRepository(records, report, 'partNo', appConfig.searchFields)
        setLoadState({ phase: 'ready', repository, report })
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        setLoadState({ phase: 'error', message })
      })
  }, [])

  // Listen for popstate so kit routing continues to work.
  useEffect(() => {
    const onPop = () => {
      setScreen(screenFromPath(window.location.pathname))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const handleStartWalk = useCallback(
    (range: BinRange) => {
      if (loadState.phase !== 'ready') return
      const inRange = entriesInRange(loadState.repository.all(), range)
      setSession({
        binRange: range,
        entries: inRange,
        checked: new Map(),
      })
      setScreen('walk')
    },
    [loadState],
  )

  const handleCheck = useCallback((partNo: string, item: CheckedItem) => {
    setSession((prev) => {
      if (!prev) return prev
      const checked = new Map(prev.checked)
      checked.set(partNo, item)
      return { ...prev, checked }
    })
  }, [])

  const handleFinish = useCallback(() => {
    setScreen('summary')
  }, [])

  const handleRestart = useCallback(() => {
    setSession(null)
    setScreen('picker')
  }, [])

  if (loadState.phase === 'loading') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: foundry.colors.bg,
          color: foundry.colors.muted,
          fontFamily: foundry.type.body,
          fontStyle: 'italic',
          fontSize: '0.9rem',
        }}
      >
        Resurrecting records…
      </div>
    )
  }

  if (loadState.phase === 'error') {
    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: foundry.colors.bg,
          color: foundry.colors.danger,
          fontFamily: foundry.type.mono,
          fontSize: '0.9rem',
          padding: '2rem',
        }}
      >
        Pipeline error: {loadState.message}
      </div>
    )
  }

  const { repository, report } = loadState

  // The kit App handles /?q=, /?id=, /report navigation in-band.
  // For the three custom screens we render directly without the kit shell's
  // search-centric layout — we still use the kit's AppHeader via the
  // ReliquaryApp for the kit-routed screens so there is no component fork.

  if (screen === 'kit') {
    return (
      <ReliquaryApp
        config={appConfig}
        repository={repository}
        getId={(entry) => entry.partNo}
      />
    )
  }

  // All custom screens share the same foundry header.
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        color: 'var(--color-ink)',
      }}
    >
      <LedgerHeader onSearchClick={() => { window.history.pushState({}, '', '/?q='); setScreen('kit') }} />

      <main id="main-content">
        {screen === 'picker' && (
          <BinPicker
            availableBins={repository.all().map((e) => e.bin)}
            onStart={handleStartWalk}
          />
        )}

        {screen === 'walk' && session && (
          <StocktakeScreen
            session={session}
            onCheck={handleCheck}
            onFinish={handleFinish}
            onRestart={handleRestart}
          />
        )}

        {screen === 'summary' && session && (
          <StocktakeSummary
            session={session}
            report={report}
            onNewWalk={handleRestart}
          />
        )}
      </main>
    </div>
  )
}

// ── LedgerHeader ──────────────────────────────────────────────────────────────
// Mirrors the kit AppHeader but provides a "Search" link and a "Report" link
// that push into kit-managed routing.

function LedgerHeader({ onSearchClick }: { onSearchClick(): void }) {
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
        <button
          type="button"
          onClick={() => { window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')) }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            textAlign: 'left',
          }}
          aria-label="Parts Ledger — go to stocktake"
        >
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.375rem',
              margin: 0,
              color: 'var(--color-bone)',
            }}
          >
            Parts Ledger
          </h1>
        </button>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            color: 'var(--color-muted)',
            margin: '0.2rem 0 0',
          }}
        >
          Redhill Motor Factors — acquired stock reconciliation
        </p>
      </div>

      <nav aria-label="Site navigation" style={{ display: 'flex', gap: '1rem' }}>
        <button
          type="button"
          onClick={onSearchClick}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            color: 'var(--color-muted)',
            padding: 0,
          }}
        >
          Search
        </button>
        <a
          href="/report"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            color: 'var(--color-muted)',
            textDecoration: 'none',
          }}
        >
          Report
        </a>
      </nav>
    </header>
  )
}
