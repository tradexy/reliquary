/**
 * Report CSV export — produces a downloadable CSV representation of a
 * ResurrectionReport.
 *
 * The file has two sections separated by a blank line:
 *   1. Summary rows (key/value pairs for the report header fields).
 *   2. Rejected rows table (sourceRef, reason).
 *
 * Commas and double-quotes are escaped per RFC 4180:
 *   - Any field containing a comma, double-quote, or newline is wrapped in
 *     double-quotes.
 *   - Existing double-quote characters are doubled ("").
 *
 * This function is pure — it has no side effects and can be called in tests
 * without a DOM.
 */

import type { ResurrectionReport } from '../contract/types.js'

/**
 * Escape a single CSV field value according to RFC 4180.
 * Always returns a string safe to place between commas.
 */
export function escapeCsvField(value: string): string {
  // If the value contains a comma, double-quote, or newline, wrap it.
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    // Double any existing double-quote characters, then wrap the whole value.
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Convert a ResurrectionReport to a CSV string.
 *
 * Layout:
 *
 *   Section 1 — Summary (two columns: Field, Value)
 *   Section 2 — Rejections (two columns: Source ref, Reason)
 *
 * Consumers can pass this string directly to a Blob for download, or write
 * it to a file in a Node.js script.
 */
export function reportToCsv(report: ResurrectionReport): string {
  const row = (...fields: string[]): string =>
    fields.map(escapeCsvField).join(',')

  const lines: string[] = []

  // ── Section 1: Summary ────────────────────────────────────────────────
  lines.push(row('Field', 'Value'))
  lines.push(row('Source', report.sourceName))
  lines.push(row('Imported at', report.importedAt))
  lines.push(row('Status', report.status))
  lines.push(row('Rows in', String(report.rowsIn)))
  lines.push(row('Rows out', String(report.rowsOut)))
  lines.push(row('Rejected', String(report.rejected.length)))

  if (report.fieldMappings.length > 0) {
    lines.push(row('Field mappings', report.fieldMappings.map((m) => `${m.sourceField} → ${m.normalisedField}`).join('; ')))
  }
  if (report.unmappedFields.length > 0) {
    lines.push(row('Unmapped fields', report.unmappedFields.join('; ')))
  }
  if (report.synthesisedFields.length > 0) {
    lines.push(row('Synthesised fields', report.synthesisedFields.join('; ')))
  }

  // ── Section 2: Rejections ─────────────────────────────────────────────
  lines.push('') // blank separator line
  if (report.rejected.length === 0) {
    lines.push(row('Rejected rows', '(none)'))
  } else {
    lines.push(row('Source ref', 'Reason'))
    for (const rejection of report.rejected) {
      lines.push(row(rejection.sourceRef, rejection.reason))
    }
  }

  return lines.join('\n')
}

/**
 * Trigger a browser download of the report as a CSV file.
 *
 * Creates a temporary <a> element, clicks it, then immediately revokes the
 * object URL to avoid leaking memory. No DOM persistence.
 *
 * @param report   The report to export.
 * @param filename The suggested filename (defaults to 'resurrection-report.csv').
 */
export function downloadReportCsv(
  report: ResurrectionReport,
  filename = 'resurrection-report.csv',
): void {
  const csv = reportToCsv(report)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
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
