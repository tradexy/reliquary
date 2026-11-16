/**
 * simulateLossyImport — produce a report as if the adapter silently dropped one row.
 *
 * Returns a new ResurrectionReport with rowsOut reduced by one (floored at 0).
 * Status is recomputed from the same equation used by buildReport:
 *
 *   lossless  ⟺  rowsIn === rowsOut + rejected.length
 *
 * The input report is never mutated. This exists solely so the UI can
 * demonstrate the publish gate without needing a real broken adapter.
 */

import type { ResurrectionReport } from '../contract/types.js'

export function simulateLossyImport(report: ResurrectionReport): ResurrectionReport {
  const rowsOut = Math.max(0, report.rowsOut - 1)
  const status: ResurrectionReport['status'] =
    report.rowsIn === rowsOut + report.rejected.length ? 'lossless' : 'inconsistent'

  return {
    ...report,
    rowsOut,
    status,
  }
}
