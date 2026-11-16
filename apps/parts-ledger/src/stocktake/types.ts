/**
 * Stocktake domain types.
 *
 * A stocktake walk steps through every entry in a chosen bin range.
 * The checker enters a counted quantity for each part; a discrepancy is
 * recorded when the counted quantity differs from the ledger quantity.
 *
 * State lives in memory for the session — no localStorage, no server.
 */

import type { LedgerEntry } from '../source/ledgerSource.js'

/** A bin range selected before beginning a stocktake walk. */
export interface BinRange {
  /** Start bin inclusive, e.g. 'A1'. */
  from: string
  /** End bin inclusive, e.g. 'A9'. */
  to: string
}

/** Outcome of checking one ledger entry. */
export type CheckOutcome =
  | { kind: 'matched' }
  | { kind: 'discrepant'; counted: number; note: string; initials: string }

/** One checked item in the walk. */
export interface CheckedItem {
  entry: LedgerEntry
  outcome: CheckOutcome
}

/** Running totals shown during the walk. */
export interface StocktakeTally {
  checked: number
  matched: number
  discrepant: number
}

/** The full state of an in-progress or completed stocktake. */
export interface StocktakeSession {
  binRange: BinRange
  /** Entries in the selected range, in bin order. */
  entries: LedgerEntry[]
  /** Results accumulated so far, keyed by partNo. */
  checked: Map<string, CheckedItem>
}

/** Compute running totals from the checked map. */
export function computeTally(checked: Map<string, CheckedItem>): StocktakeTally {
  let matched = 0
  let discrepant = 0

  for (const item of checked.values()) {
    if (item.outcome.kind === 'matched') {
      matched++
    } else {
      discrepant++
    }
  }

  return { checked: checked.size, matched, discrepant }
}

/**
 * Decide whether a bin code falls within a bin range.
 *
 * Bin codes are letter + number, e.g. 'A3', 'B12'.
 * Range comparison: row letter first, then position number.
 * e.g. A1 ≤ B9 ≤ D12 is true; B9 ≤ A1 is false.
 */
export function binInRange(bin: string, range: BinRange): boolean {
  const parsed = parseBin(bin)
  const from = parseBin(range.from)
  const to = parseBin(range.to)

  if (!parsed || !from || !to) return false

  // Compare row letter, then position.
  if (parsed.row < from.row) return false
  if (parsed.row > to.row) return false
  if (parsed.row === from.row && parsed.pos < from.pos) return false
  if (parsed.row === to.row && parsed.pos > to.pos) return false
  return true
}

/** Parse a bin code into its constituent row letter and position number. */
export function parseBin(bin: string): { row: string; pos: number } | null {
  const trimmed = bin.trim().toUpperCase()
  const match = trimmed.match(/^([A-Z]+)(\d+)$/)
  if (!match || !match[1] || !match[2]) return null
  return { row: match[1], pos: parseInt(match[2], 10) }
}

/**
 * Filter and sort entries that fall in the given bin range.
 * Sorted by bin row then position, then by partNo within the same bin.
 */
export function entriesInRange(entries: readonly LedgerEntry[], range: BinRange): LedgerEntry[] {
  return entries
    .filter((e) => binInRange(e.bin, range))
    .sort((a, b) => {
      const pa = parseBin(a.bin)
      const pb = parseBin(b.bin)
      if (!pa || !pb) return 0
      if (pa.row !== pb.row) return pa.row < pb.row ? -1 : 1
      if (pa.pos !== pb.pos) return pa.pos - pb.pos
      return a.partNo.localeCompare(b.partNo)
    })
}
