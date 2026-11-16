/**
 * Row-level safety guard.
 *
 * Legacy exports are untrusted input. A `.dbf` or CSV supplied by a third party
 * can contain field names that are dangerous to spread into a plain object —
 * `__proto__`, `constructor`, `prototype`. Object spread does not invoke setters,
 * but `Object.assign` and naive `for...in` copies do, so a hostile column name
 * can pollute `Object.prototype` and affect every object in the process.
 *
 * The pipeline refuses those rows explicitly rather than sanitising them: a
 * silently rewritten column is exactly the kind of quiet loss this kit exists to
 * prevent. The rejection appears in the Resurrection Report with a reason.
 */

import type { RawRow } from '../contract/types.js'

/** Field names that must never be carried into a record or an accumulator. */
export const UNSAFE_KEYS: ReadonlySet<string> = new Set([
  '__proto__',
  'constructor',
  'prototype',
])

/**
 * Return the unsafe field names present on a raw row, or an empty array.
 * Case-insensitive, because a dBase export is not consistent about case.
 */
export function unsafeKeys(raw: RawRow): string[] {
  const found: string[] = []
  for (const key of Object.keys(raw)) {
    if (UNSAFE_KEYS.has(key.toLowerCase())) found.push(key)
  }
  return found
}
