/**
 * Publish guard — the final gate before data reaches the Repository.
 *
 * An inconsistent report means the adapter's count() lied about how many rows
 * scan() would yield, or the pipeline itself has a bug. Either way the data
 * must not be silently accepted: the UI cannot show a green badge for something
 * we cannot verify.
 *
 * Throwing here is intentional: this is a programmer error, not bad data.
 * Bad data is handled by the Rejected path in the pipeline. An inconsistent
 * report means the invariant of the kit itself has been violated.
 */

import type { ResurrectionReport } from '../contract/types.js'
import type { PipelineResult } from './pipeline.js'

export class InconsistentReportError extends Error {
  readonly report: ResurrectionReport

  constructor(report: ResurrectionReport) {
    const delta = report.rowsIn - (report.rowsOut + report.rejected.length)
    super(
      `Cannot publish "${report.sourceName}": report is inconsistent. ` +
        `rowsIn=${report.rowsIn}, rowsOut=${report.rowsOut}, ` +
        `rejected=${report.rejected.length} (delta=${delta}). ` +
        `The adapter's count() does not match the rows scan() yielded.`,
    )
    this.name = 'InconsistentReportError'
    this.report = report
  }
}

/**
 * Publish a completed pipeline result.
 *
 * Passes the records and report through unchanged if the report is lossless.
 * Throws `InconsistentReportError` if the reconciliation equation fails —
 * this must be impossible to ignore in the UI.
 *
 * @returns The same PipelineResult, typed to prove it has been verified.
 */
export function publish<T>(result: PipelineResult<T>): PipelineResult<T> {
  if (result.report.status === 'inconsistent') {
    throw new InconsistentReportError(result.report)
  }
  return result
}
