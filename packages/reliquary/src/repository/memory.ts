/**
 * In-memory Repository over a completed pipeline result.
 *
 * Records are stored once at construction. All reads are synchronous and
 * non-mutating. The search index is built eagerly so repeated queries are
 * cheap — a linear scan over pre-lowercased strings, nothing fancier.
 *
 * The `idField` parameter names the property of T that uniquely identifies
 * each record (e.g. "id", "partNumber"). It must be a string-valued key.
 */

import type { ResurrectionReport } from '../contract/types.js'

export interface Repository<T> {
  all(): readonly T[]
  byId(id: string): T | undefined
  search(query: string): readonly T[]
  report(): ResurrectionReport
}

/**
 * Pre-computed search entry — the original record plus a single lowercase
 * string containing all searchable field values joined by a space.
 */
interface SearchEntry<T> {
  record: T
  haystack: string
}

/**
 * Build an in-memory Repository from a set of records, a report, and a list
 * of field names to include in full-text search.
 *
 * @param records        The normalised records produced by the pipeline.
 * @param report         The ResurrectionReport from the same pipeline run.
 * @param idField        Key of T whose string value is the unique identifier.
 * @param searchFields   Keys of T whose string values are searched.
 */
export function createRepository<T extends object>(
  records: readonly T[],
  report: ResurrectionReport,
  idField: keyof T & string,
  searchFields: ReadonlyArray<keyof T & string>,
): Repository<T> {
  // Build the id → record map once. Duplicate ids are a contract violation
  // caught by the PBT suite, but we defend here gracefully (last-wins).
  const idMap = new Map<string, T>()
  for (const record of records) {
    const id = String(record[idField] ?? '')
    idMap.set(id, record)
  }

  // Pre-compute one lowercase haystack string per record so search is a
  // single pass with no per-call string allocations.
  const searchIndex: SearchEntry<T>[] = records.map((record) => {
    const parts = searchFields.map((field) => String(record[field] ?? '').toLowerCase())
    return { record, haystack: parts.join(' ') }
  })

  // Freeze the records array so callers cannot mutate the store.
  const frozen: readonly T[] = Object.freeze([...records])

  return {
    all(): readonly T[] {
      return frozen
    },

    byId(id: string): T | undefined {
      return idMap.get(id)
    },

    /**
     * Search across all configured fields.
     *
     * - Empty or whitespace-only query returns all records.
     * - Multi-word query requires every word to appear somewhere in the
     *   haystack (AND semantics — strict, predictable, no relevance ranking).
     * - Comparison is lowercase on both sides; original records are returned
     *   unchanged.
     */
    search(query: string): readonly T[] {
      const trimmed = query.trim().toLowerCase()
      if (trimmed === '') return frozen

      const tokens = trimmed.split(/\s+/)
      const results: T[] = []

      for (const entry of searchIndex) {
        if (tokens.every((token) => entry.haystack.includes(token))) {
          results.push(entry.record)
        }
      }

      return results
    },

    report(): ResurrectionReport {
      return report
    },
  }
}
