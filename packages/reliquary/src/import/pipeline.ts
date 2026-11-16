/**
 * Import pipeline — the heart of the kit.
 *
 * Takes a LegacySource and an injected timestamp, processes every row, and
 * returns the full set of normalised records alongside a ResurrectionReport.
 * It never writes to disk, makes network calls, or reads the clock; callers
 * supply `importedAt` so tests are always deterministic.
 *
 * Returns a Result so bad data (rejected rows) is not an exception path —
 * exceptions are reserved for programmer errors like a malformed adapter.
 */

import type {
  LegacySource,
  RawRow,
  Normalised,
  Rejected,
  FieldMapping,
  ResurrectionReport,
} from '../contract/types.js'
import { assertValidSource } from '../contract/validate.js'
import { unsafeKeys } from './guard.js'
import { buildReport } from './report.js'

export interface PipelineResult<T> {
  report: ResurrectionReport
  records: T[]
}

/**
 * Run the import pipeline against `source`.
 *
 * Steps:
 * 1. Assert adapter conformance (programmer error → throws).
 * 2. `source.count()` → rowsIn.
 * 3. For each row from `source.scan()` → `source.normalise()`.
 * 4. Collect normalised records and rejections separately.
 * 5. Accumulate field-mapping metadata across all rows.
 * 6. Build and return the ResurrectionReport + records.
 *
 * @param source      The adapter to drain.
 * @param sourceName  Human-readable name for the report.
 * @param importedAt  ISO-8601 timestamp injected by the caller.
 */
export async function runPipeline<T>(
  source: LegacySource<T>,
  sourceName: string,
  importedAt: string,
): Promise<PipelineResult<T>> {
  // Programmer-error guard: fail before touching any data.
  assertValidSource<T>(source, sourceName)

  const rowsIn = await source.count()

  const records: T[] = []
  const rejected: Rejected[] = []

  // Accumulate field metadata across all rows, deduplicating by source field.
  const mappedFieldIndex = new Map<string, FieldMapping>()
  const unmappedFieldSet = new Set<string>()
  const synthesisedFieldSet = new Set<string>()

  for await (const raw of source.scan()) {
    // Untrusted input guard: refuse rows carrying prototype-polluting field
    // names. Rejecting is deliberate — a rewritten column would be silent loss.
    const unsafe = unsafeKeys(raw)
    if (unsafe.length > 0) {
      rejected.push({
        kind: 'rejected',
        sourceRef: `row ${records.length + rejected.length + 1}`,
        reason: `Unsafe field name(s) in source row: ${unsafe.join(', ')}`,
      })
      continue
    }

    const outcome = source.normalise(raw)

    if (outcome.kind === 'rejected') {
      rejected.push(outcome)
      continue
    }

    // outcome is Normalised<T>
    records.push(outcome.record)

    for (const mapping of outcome.mappedFields) {
      // Keep the first mapping seen for each source column; adapters must be
      // consistent, and storing duplicates would inflate the report table.
      if (!mappedFieldIndex.has(mapping.sourceField)) {
        mappedFieldIndex.set(mapping.sourceField, mapping)
      }
    }

    for (const field of outcome.unmappedFields) {
      unmappedFieldSet.add(field)
    }

    for (const { field } of outcome.synthesisedFields) {
      synthesisedFieldSet.add(field)
    }
  }

  const report = buildReport({
    sourceName,
    importedAt,
    rowsIn,
    rowsOut: records.length,
    rejected,
    fieldMappings: Array.from(mappedFieldIndex.values()),
    unmappedFields: Array.from(unmappedFieldSet),
    synthesisedFields: Array.from(synthesisedFieldSet),
  })

  return { report, records }
}
