/**
 * Report builder — assembles a ResurrectionReport and computes its status.
 *
 * `status` is derived, never accepted as an input. The only source of truth is
 * the reconciliation equation:
 *
 *   lossless  ⟺  rowsIn === rowsOut + rejected.length
 *
 * This is the central promise of the kit. Keeping the derivation here, in one
 * place, means it cannot be accidentally bypassed.
 */

import type { ResurrectionReport, Rejected, FieldMapping } from '../contract/types.js'

export interface ReportInput {
  sourceName: string
  importedAt: string
  rowsIn: number
  rowsOut: number
  rejected: Rejected[]
  fieldMappings: FieldMapping[]
  unmappedFields: string[]
  synthesisedFields: string[]
}

/**
 * Build a ResurrectionReport from pipeline output.
 *
 * The `status` field is computed here and cannot be overridden by the caller.
 * If `rowsIn !== rowsOut + rejected.length`, the report is `'inconsistent'`.
 */
export function buildReport(input: ReportInput): ResurrectionReport {
  const status: ResurrectionReport['status'] =
    input.rowsIn === input.rowsOut + input.rejected.length ? 'lossless' : 'inconsistent'

  return {
    sourceName: input.sourceName,
    importedAt: input.importedAt,
    rowsIn: input.rowsIn,
    rowsOut: input.rowsOut,
    rejected: input.rejected,
    fieldMappings: input.fieldMappings,
    unmappedFields: input.unmappedFields,
    synthesisedFields: input.synthesisedFields,
    status,
  }
}

/**
 * Check whether a report is lossless without throwing.
 * Useful for conditional rendering in the UI without catching errors.
 */
export function isLossless(report: ResurrectionReport): boolean {
  return report.status === 'lossless'
}
