/**
 * Core contract types for the Reliquary kit.
 *
 * Every adapter must implement LegacySource<T>. The two-step shape —
 * count() tells you what to expect, scan() yields it, normalise() maps it —
 * is what makes the ResurrectionReport possible without a third method.
 */

/** A single row as it arrives from the legacy source: strings, numbers, nulls. */
export type RawRow = Readonly<Record<string, string | number | null>>

/**
 * Maps one source column name to its normalised field name.
 * Kept as a value so the report can display the full translation table.
 */
export interface FieldMapping {
  sourceField: string
  normalisedField: string
}

/**
 * A row that was successfully mapped to domain type T.
 *
 * - `mappedFields`      — columns that were translated.
 * - `unmappedFields`    — columns that existed in the row but were ignored.
 * - `synthesisedFields` — fields added by the adapter that have no source column
 *   (e.g. a computed slug, a default status).
 */
export interface Normalised<T> {
  kind: 'normalised'
  record: T
  mappedFields: FieldMapping[]
  unmappedFields: string[]
  synthesisedFields: Array<{ field: string; value: unknown }>
}

/**
 * A row that could not be mapped.
 *
 * `sourceRef` is the only link back to the original row. Everything the UI
 * shows about a rejected row comes from it, so it must be human-readable.
 */
export interface Rejected {
  kind: 'rejected'
  sourceRef: string
  reason: string
}

/**
 * The adapter contract. Two async methods plus one sync per-row mapper.
 *
 * Rules:
 * - `count()` must return the number of rows `scan()` will yield.
 * - `scan()` must be restartable: calling it twice yields the same rows.
 * - `normalise()` is pure and side-effect free.
 */
export interface LegacySource<T> {
  /** Total rows the source believes it contains. */
  count(): Promise<number>
  /** Yield rows in source order. Must be restartable and side-effect free. */
  scan(): AsyncIterable<RawRow>
  /** Map one raw row to a domain record, or explain the rejection. */
  normalise(raw: RawRow): Normalised<T> | Rejected
}

/**
 * The reconciliation report produced by a completed import.
 *
 * `status` is always computed — never set by hand:
 *   lossless  ⟺  rowsIn === rowsOut + rejected.length
 *
 * If that equation fails the import pipeline detected a programmer error in the
 * adapter (it yielded more or fewer rows than count() promised).
 */
export interface ResurrectionReport {
  sourceName: string
  importedAt: string
  rowsIn: number
  rowsOut: number
  rejected: Rejected[]
  fieldMappings: FieldMapping[]
  unmappedFields: string[]
  synthesisedFields: string[]
  status: 'lossless' | 'inconsistent'
}
