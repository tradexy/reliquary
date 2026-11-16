/**
 * Card Catalogue source adapter.
 *
 * Wraps a dBase-style JSON export (column names in ALL CAPS, fixed-width string
 * padding, freeform date strings) and maps it to CatalogueCard.
 *
 * Rejection rules — every rejection must be auditable:
 *   - Missing or blank SHELFMARK → rejected; it is the unique identifier.
 *   - Blank TITLE → rejected; a card without a title cannot be meaningfully searched.
 *   - DATE that contains only digits and is not four digits long → rejected;
 *     e.g. '18999' is impossible, but 'c.1893' and '1893-1901' are acceptable
 *     documentary dates preserved as-is in the year field.
 *
 * The adapter never silently drops or coerces a record — every rejection goes
 * into the ResurrectionReport.
 */

import type { LegacySource, RawRow, Normalised, Rejected } from '@reliquary/kit/contract'

/** The domain record produced by this adapter. */
export interface CatalogueCard {
  shelfmark: string
  surname: string
  forenames: string
  title: string
  /** Null when the source date is absent or cannot be parsed to a year number. */
  year: number | null
  subject: string
  notes: string
}

// Column names as they appear in the raw dBase export (ALL CAPS, trimmed of
// padding before comparison but kept verbatim in mappedFields for the report).
const COL = {
  SHELFMARK: 'SHELFMARK',
  SURNAME: 'SURNAME',
  FORENAMES: 'FORENAMES',
  TITLE: 'TITLE',
  DATE: 'DATE',
  SUBJECT: 'SUBJECT',
  NOTES: 'NOTES',
} as const

/** Columns that are translated into CatalogueCard fields. */
const MAPPED_FIELDS = [
  { sourceField: COL.SHELFMARK, normalisedField: 'shelfmark' },
  { sourceField: COL.SURNAME, normalisedField: 'surname' },
  { sourceField: COL.FORENAMES, normalisedField: 'forenames' },
  { sourceField: COL.TITLE, normalisedField: 'title' },
  { sourceField: COL.DATE, normalisedField: 'year' },
  { sourceField: COL.SUBJECT, normalisedField: 'subject' },
  { sourceField: COL.NOTES, normalisedField: 'notes' },
]

/** Column names we know about — anything else is unmapped and reported. */
const KNOWN_COLUMNS = new Set(Object.values(COL))

/**
 * Parse a dBase date string into a year number, or null.
 *
 * Acceptable forms (documentary style, no coercion):
 *   '1893'       → 1893
 *   'c.1893'     → 1893
 *   '1893-1901'  → 1893  (uses the earlier year)
 *   '1893?'      → 1893
 *   ''           → null  (absent date is recorded as null, not rejected)
 *
 * Impossible forms (rejected upstream before this function is called):
 *   '18999'      → caller rejects; not passed here
 */
export function parseDateYear(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null

  // Extract the first run of four consecutive digits.
  const match = trimmed.match(/\d{4}/)
  if (!match || match[0] === undefined) return null

  const year = parseInt(match[0], 10)
  // Sanity-check: 1000–2099 covers any reasonable local history record.
  if (year < 1000 || year > 2099) return null
  return year
}

/**
 * Decide whether a DATE string is structurally impossible (and therefore
 * sufficient reason to reject the row).
 *
 * A date is impossible when it consists of only digits (no documentary
 * qualifiers) but those digits do not form a plausible four-digit year.
 * Blank dates are accepted; documentary forms like 'c.1893', '1893-1901',
 * '1893?' all pass.
 */
export function isImpossibleDate(raw: string): boolean {
  const trimmed = raw.trim()
  if (trimmed === '') return false
  // If it is purely numeric, it must be exactly four digits.
  if (/^\d+$/.test(trimmed)) {
    return trimmed.length !== 4
  }
  return false
}

/** Build the sourceRef string used in rejections. */
function sourceRef(raw: RawRow): string {
  const shelfmark = typeof raw[COL.SHELFMARK] === 'string'
    ? (raw[COL.SHELFMARK] as string).trim()
    : ''
  const surname = typeof raw[COL.SURNAME] === 'string'
    ? (raw[COL.SURNAME] as string).trim()
    : ''
  const title = typeof raw[COL.TITLE] === 'string'
    ? (raw[COL.TITLE] as string).trim()
    : ''
  // Compose the most informative reference available.
  if (shelfmark) return `Shelfmark ${shelfmark}`
  if (surname && title) return `${surname} — ${title}`
  if (title) return title
  if (surname) return surname
  return 'row with no identifying fields'
}

/** Trim a raw string column value, defaulting to '' if absent. */
function col(raw: RawRow, name: string): string {
  const val = raw[name]
  if (typeof val === 'string') return val.trim()
  if (typeof val === 'number') return String(val)
  return ''
}

/**
 * Create a LegacySource<CatalogueCard> over a pre-loaded array of raw rows.
 *
 * The rows must already be parsed from JSON — this adapter does no I/O.
 * This keeps the adapter pure and the pipeline deterministic.
 */
export function createCardSource(rows: RawRow[]): LegacySource<CatalogueCard> {
  return {
    async count(): Promise<number> {
      return rows.length
    },

    async *scan(): AsyncIterable<RawRow> {
      for (const row of rows) {
        yield row
      }
    },

    normalise(raw: RawRow): Normalised<CatalogueCard> | Rejected {
      const ref = sourceRef(raw)
      const shelfmark = col(raw, COL.SHELFMARK)
      const title = col(raw, COL.TITLE)
      const dateRaw = col(raw, COL.DATE)

      // Rule 1: SHELFMARK is the unique identifier. Without it the record
      // cannot be located in the archive and must be rejected.
      if (!shelfmark) {
        return {
          kind: 'rejected',
          sourceRef: ref,
          reason: 'Missing SHELFMARK — record cannot be identified without an archive reference.',
        }
      }

      // Rule 2: TITLE blank — the primary search field; a card without it is
      // unsearchable and misleading.
      if (!title) {
        return {
          kind: 'rejected',
          sourceRef: ref,
          reason: 'Blank TITLE — a card without a title cannot be meaningfully indexed.',
        }
      }

      // Rule 3: DATE is structurally impossible (e.g. '18999').
      if (isImpossibleDate(dateRaw)) {
        return {
          kind: 'rejected',
          sourceRef: ref,
          reason: `Impossible DATE "${dateRaw}" — not a valid year or documentary date form (expected e.g. '1893', 'c.1893', '1893-1901').`,
        }
      }

      const year = parseDateYear(dateRaw)

      // Identify any columns in the row that are not in the known schema.
      const unmappedFields = Object.keys(raw).filter((k) => !KNOWN_COLUMNS.has(k as keyof typeof COL))

      return {
        kind: 'normalised',
        record: {
          shelfmark,
          surname: col(raw, COL.SURNAME),
          forenames: col(raw, COL.FORENAMES),
          title,
          year,
          subject: col(raw, COL.SUBJECT),
          notes: col(raw, COL.NOTES),
        },
        mappedFields: MAPPED_FIELDS,
        unmappedFields,
        synthesisedFields: [],
      }
    },
  }
}
