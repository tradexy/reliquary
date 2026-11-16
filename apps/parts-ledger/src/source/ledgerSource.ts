/**
 * Parts Ledger source adapter.
 *
 * Wraps a dot-matrix printer export of a motor factor's stock ledger.
 * Column names are ALL CAPS with space-padded values, typical of a 1990s
 * dot-matrix printout captured to ASCII.
 *
 * Columns: PART_NO, DESCRIPTION, VEHICLE, QTY, BIN, STATUS, PRICE_P, LAST_MOVED
 *
 * Rejection rules (all auditable, nothing silently dropped):
 *   1. QTY contains non-numeric text (e.g. 'n/a') — cannot be stocked without a count.
 *   2. BIN is blank — cannot be physically located without a bin code.
 *   3. STATUS is a letter not in { A, D } — unknown status codes cannot be mapped safely.
 *
 * Notes on coercion:
 *   - Part numbers are zero-padded strings: '00412' stays '00412' (not coerced to 412).
 *   - Prices are integers in pence: '1250' → 1250. Blank → null.
 *   - LAST_MOVED is kept as a trimmed string; blank → null.
 *   - STATUS: 'A' → 'active', 'D' → 'discontinued', anything else → rejected.
 */

import type { LegacySource, RawRow, Normalised, Rejected } from '@reliquary/kit/contract'

/** The domain record produced by this adapter. */
export interface LedgerEntry {
  /** Zero-padded part number, e.g. '00412'. Used as the unique identifier. */
  partNo: string
  description: string
  vehicle: string
  /** Physical stock count. Always a non-negative integer when normalised. */
  qty: number
  /** Bin location code, e.g. 'A3'. */
  bin: string
  status: 'active' | 'discontinued' | 'unknown'
  /** Price in pence. Null when the source field is blank or unparseable. */
  priceP: number | null
  /** Date string from the source, e.g. '15/03/1998'. Null when blank. */
  lastMoved: string | null
}

// Column names as they appear in the raw export.
const COL = {
  PART_NO: 'PART_NO',
  DESCRIPTION: 'DESCRIPTION',
  VEHICLE: 'VEHICLE',
  QTY: 'QTY',
  BIN: 'BIN',
  STATUS: 'STATUS',
  PRICE_P: 'PRICE_P',
  LAST_MOVED: 'LAST_MOVED',
} as const

const MAPPED_FIELDS = [
  { sourceField: COL.PART_NO, normalisedField: 'partNo' },
  { sourceField: COL.DESCRIPTION, normalisedField: 'description' },
  { sourceField: COL.VEHICLE, normalisedField: 'vehicle' },
  { sourceField: COL.QTY, normalisedField: 'qty' },
  { sourceField: COL.BIN, normalisedField: 'bin' },
  { sourceField: COL.STATUS, normalisedField: 'status' },
  { sourceField: COL.PRICE_P, normalisedField: 'priceP' },
  { sourceField: COL.LAST_MOVED, normalisedField: 'lastMoved' },
]

const KNOWN_COLUMNS = new Set(Object.values(COL))

/** Trim a raw column value to a string; returns '' if absent. */
function col(raw: RawRow, name: string): string {
  const val = raw[name]
  if (typeof val === 'string') return val.trim()
  if (typeof val === 'number') return String(val)
  return ''
}

/** Build a human-readable sourceRef for rejection messages. */
function sourceRef(raw: RawRow): string {
  const partNo = col(raw, COL.PART_NO)
  const desc = col(raw, COL.DESCRIPTION)
  if (partNo) return `Part ${partNo}`
  if (desc) return `Part (no number): ${desc.slice(0, 40)}`
  return 'row with no identifying fields'
}

/**
 * Map a STATUS letter to the domain union.
 * Returns null if the letter is unrecognised — the caller rejects the row.
 */
export function parseStatus(raw: string): 'active' | 'discontinued' | null {
  switch (raw.trim().toUpperCase()) {
    case 'A': return 'active'
    case 'D': return 'discontinued'
    default: return null
  }
}

/**
 * Parse QTY from a space-padded string.
 * Returns the integer on success, or null if the value is non-numeric.
 */
export function parseQty(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  // Must be an integer (possibly negative for adjustments, but not in this dataset).
  if (!/^-?\d+$/.test(trimmed)) return null
  return parseInt(trimmed, 10)
}

/**
 * Parse PRICE_P from a string of pence.
 * Returns null for blank values; rejects nothing — a missing price is recorded as null.
 */
export function parsePriceP(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const n = parseInt(trimmed, 10)
  return Number.isFinite(n) ? n : null
}

/**
 * Create a LegacySource<LedgerEntry> over a pre-loaded array of raw rows.
 * No I/O — the rows must already be parsed from JSON.
 */
export function createLedgerSource(rows: RawRow[]): LegacySource<LedgerEntry> {
  return {
    async count(): Promise<number> {
      return rows.length
    },

    async *scan(): AsyncIterable<RawRow> {
      for (const row of rows) {
        yield row
      }
    },

    normalise(raw: RawRow): Normalised<LedgerEntry> | Rejected {
      const ref = sourceRef(raw)
      const qtyRaw = col(raw, COL.QTY)
      const binRaw = col(raw, COL.BIN)
      const statusRaw = col(raw, COL.STATUS)

      // Rule 1: QTY must be numeric. 'n/a', blank, or text values cannot
      // represent a physical stock count.
      const qty = parseQty(qtyRaw)
      if (qty === null) {
        return {
          kind: 'rejected',
          sourceRef: ref,
          reason: `Non-numeric QTY "${qtyRaw}" — a physical count must be an integer.`,
        }
      }

      // Rule 2: BIN is required. Without a bin code the item cannot be
      // located on the shelf and cannot be included in a stocktake walk.
      if (!binRaw) {
        return {
          kind: 'rejected',
          sourceRef: ref,
          reason: 'Missing BIN — item cannot be located without a bin code.',
        }
      }

      // Rule 3: STATUS must map to a known value. Unknown letters from the
      // legacy system cannot be safely interpreted and may indicate data
      // corruption.
      const status = parseStatus(statusRaw)
      if (status === null) {
        return {
          kind: 'rejected',
          sourceRef: ref,
          reason: `Unknown STATUS code "${statusRaw}" — expected 'A' (active) or 'D' (discontinued).`,
        }
      }

      const unmappedFields = Object.keys(raw).filter((k) => !KNOWN_COLUMNS.has(k as keyof typeof COL))

      const lastMovedRaw = col(raw, COL.LAST_MOVED)

      return {
        kind: 'normalised',
        record: {
          partNo: col(raw, COL.PART_NO),
          description: col(raw, COL.DESCRIPTION),
          vehicle: col(raw, COL.VEHICLE),
          qty,
          bin: binRaw,
          status,
          priceP: parsePriceP(col(raw, COL.PRICE_P)),
          lastMoved: lastMovedRaw || null,
        },
        mappedFields: MAPPED_FIELDS,
        unmappedFields,
        synthesisedFields: [],
      }
    },
  }
}
