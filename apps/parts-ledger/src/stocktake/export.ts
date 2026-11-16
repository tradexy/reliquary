/**
 * Stocktake export utilities.
 *
 * Produces two downloadable files:
 *   1. CSV of discrepancies (partNo, description, vehicle, bin, ledgerQty,
 *      countedQty, delta, note, initials).
 *   2. Combined CSV: discrepancy list followed by the Resurrection Report.
 *
 * The kit's escapeCsvField is reused — no forking.
 */

import { escapeCsvField, reportToCsv } from '@reliquary/kit/ui'
import type { ResurrectionReport } from '@reliquary/kit/contract'
import type { StocktakeSession, CheckedItem } from './types.js'

/** Extract only the discrepant items from a session's checked map. */
export function discrepancies(checked: Map<string, CheckedItem>): CheckedItem[] {
  return Array.from(checked.values()).filter((i) => i.outcome.kind === 'discrepant')
}

/**
 * Convert a session's discrepancies to a CSV string.
 *
 * Columns: Part No, Description, Vehicle, Bin, Ledger Qty, Counted, Delta, Note, Initials
 */
export function discrepanciesToCsv(session: StocktakeSession): string {
  const row = (...fields: string[]) => fields.map(escapeCsvField).join(',')
  const lines: string[] = []

  lines.push(row('Part No', 'Description', 'Vehicle', 'Bin', 'Ledger Qty', 'Counted', 'Delta', 'Note', 'Initials'))

  for (const item of discrepancies(session.checked)) {
    if (item.outcome.kind !== 'discrepant') continue
    const delta = item.outcome.counted - item.entry.qty
    lines.push(
      row(
        item.entry.partNo,
        item.entry.description,
        item.entry.vehicle,
        item.entry.bin,
        String(item.entry.qty),
        String(item.outcome.counted),
        (delta > 0 ? '+' : '') + String(delta),
        item.outcome.note,
        item.outcome.initials,
      ),
    )
  }

  return lines.join('\n')
}

/**
 * Combined CSV: discrepancy list + Resurrection Report, separated by a
 * blank line and a section header.
 */
export function combinedExportCsv(session: StocktakeSession, report: ResurrectionReport): string {
  const discCsv = discrepanciesToCsv(session)
  const reportCsv = reportToCsv(report)

  return [
    `Stocktake Discrepancies — bins ${session.binRange.from}-${session.binRange.to}`,
    '',
    discCsv,
    '',
    'Resurrection Report',
    '',
    reportCsv,
  ].join('\n')
}

/** Trigger a browser download of a string as a file. */
function download(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadDiscrepanciesCsv(session: StocktakeSession): void {
  const csv = discrepanciesToCsv(session)
  download(csv, `discrepancies-${session.binRange.from}-${session.binRange.to}.csv`, 'text/csv')
}

export function downloadCombinedCsv(session: StocktakeSession, report: ResurrectionReport): void {
  const csv = combinedExportCsv(session, report)
  download(csv, `stocktake-${session.binRange.from}-${session.binRange.to}.csv`, 'text/csv')
}
