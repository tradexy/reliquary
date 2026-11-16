/**
 * PrintRequestSlip — a printable reader request form.
 *
 * Rendered as an overlay/modal on the Record screen. When the user clicks
 * "Print slip", window.print() is called; the print stylesheet in index.html
 * hides everything except .print-request-slip so only this element appears
 * on the printed page.
 *
 * Fields: reader name (blank line to fill in), shelfmark, title, date.
 * The society name and date of request are added automatically.
 *
 * The slip is sized for A5 landscape (a standard archive request slip size).
 */

import React, { useCallback, useEffect, useRef } from 'react'
import type { CatalogueCard } from './source/cardSource.js'

interface PrintRequestSlipProps {
  card: CatalogueCard
  onClose(): void
}

export function PrintRequestSlip({ card, onClose }: PrintRequestSlipProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  // Focus the close button on mount for keyboard users.
  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  // Close on Escape.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const requestDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const displayYear = card.year != null ? String(card.year) : '—'

  return (
    <>
      {/* Screen overlay ─────────────────────────────────────────────────── */}
      {/* biome-ignore lint: intentional backdrop click to close */}
      <div
        role="presentation"
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          zIndex: 10,
        }}
      />

      {/* Dialog ──────────────────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Print request slip"
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 11,
          padding: '1rem',
        }}
      >
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-bone)',
            borderRadius: 'var(--radius)',
            padding: 'var(--density)',
            width: '100%',
            maxWidth: '36rem',
            fontFamily: 'var(--font-body)',
            color: 'var(--color-ink)',
          }}
        >
          {/* Modal header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--density)',
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1rem',
                margin: 0,
                color: 'var(--color-bone)',
              }}
            >
              Reader Request Slip
            </h2>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close request slip"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-muted)',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: '1rem',
                padding: '0.2rem 0.4rem',
              }}
            >
              ✕
            </button>
          </div>

          {/* Slip preview ────────────────────────────────────────────── */}
          <div
            className="print-request-slip"
            style={{ display: 'block' }}
          >
            <div
              className="request-slip"
              style={{
                border: '1px solid var(--color-bone)',
                padding: 'var(--density)',
                borderRadius: 'var(--radius)',
                marginBottom: 'var(--density)',
              }}
            >
              {/* Header */}
              <div
                className="request-slip__header"
                style={{
                  borderBottom: '1px solid var(--color-bone)',
                  paddingBottom: '0.5rem',
                  marginBottom: '0.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div
                    className="request-slip__society"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.7rem',
                      color: 'var(--color-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                    }}
                  >
                    Ashworth Local History Society
                  </div>
                  <h3
                    className="request-slip__heading"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1rem',
                      fontWeight: 400,
                      margin: '0.2rem 0 0',
                      color: 'var(--color-bone)',
                    }}
                  >
                    Archive Request
                  </h3>
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: 'var(--color-muted)',
                    textAlign: 'right',
                  }}
                >
                  {requestDate}
                </div>
              </div>

              {/* Fields */}
              <SlipField label="Shelfmark" value={card.shelfmark} />
              <SlipField label="Title" value={card.title} />
              <SlipField label="Date" value={displayYear} />

              {/* Reader name — blank fill line */}
              <div
                className="request-slip__reader-line"
                style={{
                  marginTop: '0.75rem',
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '0.5rem',
                }}
              >
                <span
                  className="request-slip__label"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    color: 'var(--color-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    flexShrink: 0,
                  }}
                >
                  Reader name
                </span>
                <div
                  className="request-slip__signature-box"
                  style={{
                    flex: 1,
                    borderBottom: '1px solid var(--color-bone)',
                    minHeight: '1.4rem',
                  }}
                />
              </div>

              <div
                className="request-slip__footer"
                style={{
                  marginTop: '0.5rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  color: 'var(--color-muted)',
                  textAlign: 'right',
                }}
              >
                Please present this slip to the duty archivist.
              </div>
            </div>
          </div>

          {/* Action row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8125rem',
                padding: '0.35rem 0.75rem',
                background: 'none',
                color: 'var(--color-muted)',
                border: '1px solid var(--color-bone)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8125rem',
                padding: '0.35rem 0.75rem',
                background: 'var(--color-surface)',
                color: 'var(--color-accent)',
                border: '1px solid var(--color-accent)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
              }}
            >
              ⎙ Print slip
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function SlipField({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="request-slip__field"
      style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '0.4rem',
        borderBottom: '1px solid var(--color-surface)',
        paddingBottom: '0.3rem',
      }}
    >
      <span
        className="request-slip__label"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          color: 'var(--color-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          minWidth: '5rem',
          flexShrink: 0,
          paddingTop: '1px',
        }}
      >
        {label}
      </span>
      <span
        className="request-slip__value"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.9rem',
          color: 'var(--color-ink)',
        }}
      >
        {value}
      </span>
    </div>
  )
}
