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
 * The "Print slip" button is placed inside the index card's top band via
 * renderHeaderAction. The kit renders it in-band; no floating overlay needed.
 */

import React, { useState, useEffect, useCallback } from 'react'
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

/** Convert a string to title case (each word's first letter uppercased). */
const SMALL_WORDS = new Set(['of', 'the', 'and', 'in', 'on', 'at', 'to', 'for', 'a', 'an'])

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(/(\s+)/)
    .map((word, i) => {
      if (i === 0 || !SMALL_WORDS.has(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1)
      }
      return word
    })
    .join('')
}

/** Loading / error states before the repository is ready. */
type State =
  | { phase: 'loading' }
  | { phase: 'ready'; repository: Repository<CatalogueCard> }
  | { phase: 'error'; message: string }

export function App() {
  const [state, setState] = useState<State>({ phase: 'loading' })
  const [slipCard, setSlipCard] = useState<CatalogueCard | null>(null)
  const closeSlip = useCallback(() => setSlipCard(null), [])

  useEffect(() => {
    const rows = rawCards as RawRow[]
    const source = createCardSource(rows)

    runPipeline(source, SOURCE_NAME, new Date().toISOString())
      .then(({ report, records }) => {
        const repository = createRepository(
          records,
          report,
          'shelfmark',
          ['surname', 'title', 'shelfmark', 'subject'],
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
   * Request-slip button rendered inside the card top band via renderHeaderAction.
   * Keeps the action co-located with the record — no floating overlay.
   */
  function SlipButton({ card }: { card: CatalogueCard }) {
    return (
      <button
        type="button"
        aria-label="Print a request slip for this record"
        onClick={() => setSlipCard(card)}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          padding: '0.25rem 0.65rem',
          background: 'transparent',
          color: 'var(--color-muted)',
          border: '1px solid rgba(212,201,168,0.3)',
          borderRadius: 'var(--radius)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          outline: 'none',
          transition: 'color var(--motion-duration, 150ms) ease, border-color var(--motion-duration, 150ms) ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--color-ink)'
          e.currentTarget.style.borderColor = 'var(--color-accent)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--color-muted)'
          e.currentTarget.style.borderColor = 'rgba(212,201,168,0.3)'
        }}
        onFocus={(e) => {
          e.currentTarget.style.outlineOffset = '2px'
          e.currentTarget.style.outline = '2px solid var(--color-accent)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = 'none'
        }}
      >
        <span aria-hidden="true">⎙</span>
        Request slip
      </button>
    )
  }

  const appConfig: AppConfig<CatalogueCard> = {
    title: 'Card Catalogue',
    subtitle: 'Ashworth Local History Society — Index resurrected from the 1994 dBase export',
    searchFields: ['surname', 'title', 'shelfmark', 'subject'],
    renderRecord,
    renderSummary(card: CatalogueCard) {
      const primary = toTitleCase(card.title)
      const secondary =
        card.surname || card.forenames
          ? [card.surname, card.forenames].filter(Boolean).join(', ')
          : undefined
      const meta = card.year !== null ? String(card.year) : 'n.d.'
      return { primary, secondary, meta }
    },
    renderHeaderAction: (card: CatalogueCard) => <SlipButton card={card} />,
    theme: ossuary,
  }

  return (
    <>
      <ReliquaryApp
        config={appConfig}
        repository={repository}
        getId={(card) => card.shelfmark}
      />

      {/* Print slip modal — rendered when a card is selected */}
      {slipCard && (
        <PrintRequestSlip
          card={slipCard}
          onClose={closeSlip}
        />
      )}
    </>
  )
}
