/**
 * Card Catalogue — app entry component.
 *
 * Runs the import pipeline once at startup from the bundled JSON export,
 * then hands the resulting Repository to the kit's App shell.
 *
 * The pipeline is deterministic: same JSON in → same ResurrectionReport out.
 * Three rows in the dataset are intentionally broken; they appear on the
 * Report screen's rejection table.
 *
 * renderRecord returns sections styled as a typed index card:
 *   Identification  — shelfmark, surname, forenames
 *   Description     — title, year, subject
 *   Notes           — notes
 *
 * A "Print slip" button is overlaid on the Record screen by reading the
 * URL's ?id= param directly — the kit's App shell owns the routing, so we
 * render the slip as a sibling portal rather than fighting the routing layer.
 */

import React, { useState, useEffect } from 'react'
import { App as ReliquaryApp } from '@reliquary/kit/ui'
import { ossuary } from '@reliquary/kit/ui'
import type { AppConfig, RecordSection } from '@reliquary/kit/ui'
import { runPipeline } from '@reliquary/kit/import'
import { createRepository } from '@reliquary/kit/repository'
import type { Repository } from '@reliquary/kit/repository'
import { createCardSource } from './source/cardSource.js'
import type { CatalogueCard } from './source/cardSource.js'
import type { RawRow } from '@reliquary/kit/contract'
import { PrintRequestSlip } from './PrintRequestSlip.js'

// cards.json is bundled at build time — Vite resolves the JSON import.
import rawCards from '../data/cards.json'

const SOURCE_NAME = 'Ashworth Local History Society — Card Index 1994'

/** Convert a CatalogueCard into sections for the Record screen. */
function renderRecord(card: CatalogueCard): RecordSection[] {
  return [
    {
      heading: 'Identification',
      fields: [
        { label: 'Shelfmark', value: card.shelfmark },
        { label: 'Surname', value: card.surname || null },
        { label: 'Forenames', value: card.forenames || null },
      ],
    },
    {
      heading: 'Description',
      fields: [
        { label: 'Title', value: card.title },
        { label: 'Year', value: card.year },
        { label: 'Subject', value: card.subject || null },
      ],
    },
    {
      heading: 'Notes',
      fields: [
        { label: 'Notes', value: card.notes || null },
      ],
    },
  ]
}

const appConfig: AppConfig<CatalogueCard> = {
  title: 'Card Catalogue',
  subtitle: 'Ashworth Local History Society — Index resurrected from the 1994 dBase export',
  searchFields: ['surname', 'title', 'shelfmark', 'subject'],
  renderRecord,
  theme: ossuary,
}

/** Loading / error states before the repository is ready. */
type State =
  | { phase: 'loading' }
  | { phase: 'ready'; repository: Repository<CatalogueCard> }
  | { phase: 'error'; message: string }

/**
 * Read the current record id from the URL, if any.
 * Returns null when not on a record page.
 */
function getCurrentRecordId(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('id')
}

export function App() {
  const [state, setState] = useState<State>({ phase: 'loading' })
  const [slipCard, setSlipCard] = useState<CatalogueCard | null>(null)

  useEffect(() => {
    const rows = rawCards as RawRow[]
    const source = createCardSource(rows)

    runPipeline(source, SOURCE_NAME, new Date().toISOString())
      .then(({ report, records }) => {
        const repository = createRepository(
          records,
          report,
          'shelfmark',
          appConfig.searchFields,
        )
        setState({ phase: 'ready', repository })
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        setState({ phase: 'error', message })
      })
  }, [])

  if (state.phase === 'loading') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: ossuary.colors.bg,
          color: ossuary.colors.muted,
          fontFamily: ossuary.type.body,
          fontStyle: 'italic',
          fontSize: '0.9rem',
        }}
      >
        Resurrecting records…
      </div>
    )
  }

  if (state.phase === 'error') {
    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: ossuary.colors.bg,
          color: ossuary.colors.danger,
          fontFamily: ossuary.type.mono,
          fontSize: '0.9rem',
          padding: '2rem',
        }}
      >
        Pipeline error: {state.message}
      </div>
    )
  }

  const { repository } = state

  /**
   * "Print slip" button — rendered as a fixed overlay on record pages only.
   * It reads the URL to find the current record id, looks it up in the
   * repository, and shows the slip modal on click.
   */
  function PrintSlipTrigger() {
    const id = getCurrentRecordId()
    if (!id) return null
    const card = repository.byId(id)
    if (!card) return null

    return (
      <div
        style={{
          position: 'fixed',
          bottom: 'var(--density)',
          right: 'var(--density)',
          zIndex: 9,
        }}
      >
        <button
          type="button"
          aria-label="Print a request slip for this record"
          onClick={() => setSlipCard(card)}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8125rem',
            padding: '0.5rem 1rem',
            background: 'var(--color-surface)',
            color: 'var(--color-muted)',
            border: '1px solid var(--color-bone)',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          <span aria-hidden="true">⎙</span>
          Request slip
        </button>
      </div>
    )
  }

  return (
    <>
      <ReliquaryApp
        config={appConfig}
        repository={repository}
        getId={(card) => card.shelfmark}
      />

      {/* Print slip trigger — only visible on record pages */}
      <PrintSlipTrigger />

      {/* Print slip modal — rendered when a card is selected */}
      {slipCard && (
        <PrintRequestSlip
          card={slipCard}
          onClose={() => setSlipCard(null)}
        />
      )}
    </>
  )
}
