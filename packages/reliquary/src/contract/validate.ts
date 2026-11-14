/**
 * Runtime guard for adapter conformance.
 *
 * TypeScript guarantees the shape at compile time, but adapters can be loaded
 * dynamically or arrive from outside the type system. This guard gives a clear
 * error message rather than a baffling "scan is not a function" at import time.
 *
 * We only check that the three required methods exist and are callable — we
 * cannot call them here without side effects.
 */

import type { LegacySource, RawRow } from './types.js'

/** Validation failure: which method is absent or of the wrong type. */
export interface ValidationFailure {
  ok: false
  missing: string[]
}

export interface ValidationSuccess {
  ok: true
}

export type ValidationResult = ValidationSuccess | ValidationFailure

/**
 * Check that `candidate` satisfies the `LegacySource<T>` contract at runtime.
 *
 * Returns a `ValidationResult` rather than throwing, so callers can decide
 * how loudly to fail. Use `assertValidSource` when you want an exception.
 */
export function validateSource<T>(
  candidate: unknown,
): ValidationResult {
  if (candidate === null || typeof candidate !== 'object') {
    return { ok: false, missing: ['count', 'scan', 'normalise'] }
  }

  const obj = candidate as Record<string, unknown>
  const missing: string[] = []

  if (typeof obj['count'] !== 'function') missing.push('count')
  if (typeof obj['scan'] !== 'function') missing.push('scan')
  if (typeof obj['normalise'] !== 'function') missing.push('normalise')

  if (missing.length > 0) return { ok: false, missing }
  return { ok: true }
}

/**
 * Assert that `candidate` conforms to `LegacySource<T>`, throwing a descriptive
 * error if it does not.
 *
 * Use this at the entry point of the import pipeline so a misconfigured adapter
 * fails loudly before any rows are processed.
 */
export function assertValidSource<T>(
  candidate: unknown,
  sourceName = 'unknown',
): asserts candidate is LegacySource<T> {
  const result = validateSource<T>(candidate)
  if (!result.ok) {
    throw new TypeError(
      `Source "${sourceName}" is missing required methods: ${result.missing.join(', ')}. ` +
        `A LegacySource must implement count(), scan(), and normalise().`,
    )
  }
}
