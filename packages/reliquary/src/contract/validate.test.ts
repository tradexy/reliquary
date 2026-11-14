import { describe, it, expect } from 'vitest'
import { validateSource, assertValidSource } from './validate.js'
import type { LegacySource, RawRow, Normalised, Rejected } from './types.js'

// A minimal valid adapter used as a baseline.
function makeValidSource(): LegacySource<{ id: string }> {
  return {
    count: async () => 0,
    scan: async function* () {},
    normalise(raw: RawRow): Normalised<{ id: string }> | Rejected {
      const id = raw['id']
      if (typeof id !== 'string' || id === '') {
        return { kind: 'rejected', sourceRef: String(raw['id'] ?? '(none)'), reason: 'missing id' }
      }
      return {
        kind: 'normalised',
        record: { id },
        mappedFields: [{ sourceField: 'id', normalisedField: 'id' }],
        unmappedFields: [],
        synthesisedFields: [],
      }
    },
  }
}

describe('validateSource', () => {
  it('accepts a fully conformant adapter', () => {
    const result = validateSource(makeValidSource())
    expect(result.ok).toBe(true)
  })

  it('rejects null', () => {
    const result = validateSource(null)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missing).toContain('count')
      expect(result.missing).toContain('scan')
      expect(result.missing).toContain('normalise')
    }
  })

  it('rejects a plain string', () => {
    const result = validateSource('not an object')
    expect(result.ok).toBe(false)
  })

  it('rejects an empty object — all three methods missing', () => {
    const result = validateSource({})
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missing).toEqual(expect.arrayContaining(['count', 'scan', 'normalise']))
      expect(result.missing).toHaveLength(3)
    }
  })

  it('reports exactly the missing methods when only some are absent', () => {
    const partial = {
      count: async () => 0,
      scan: async function* () {},
      // normalise is missing
    }
    const result = validateSource(partial)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missing).toEqual(['normalise'])
    }
  })

  it('reports count missing when count is a non-function value', () => {
    const bad = { count: 42, scan: async function* () {}, normalise: () => {} }
    const result = validateSource(bad)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missing).toEqual(['count'])
    }
  })

  it('reports scan missing when scan is null', () => {
    const bad = { count: async () => 0, scan: null, normalise: () => {} }
    const result = validateSource(bad)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missing).toEqual(['scan'])
    }
  })

  it('reports normalise missing when normalise is undefined', () => {
    const bad = { count: async () => 0, scan: async function* () {} }
    const result = validateSource(bad)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.missing).toEqual(['normalise'])
    }
  })
})

describe('assertValidSource', () => {
  it('does not throw for a valid adapter', () => {
    expect(() => assertValidSource(makeValidSource(), 'test-source')).not.toThrow()
  })

  it('throws a TypeError for a missing adapter', () => {
    expect(() => assertValidSource({}, 'bad-source')).toThrow(TypeError)
  })

  it('includes the source name in the error message', () => {
    expect(() => assertValidSource({}, 'my-broken-source')).toThrow('my-broken-source')
  })

  it('includes every missing method name in the error message', () => {
    const partial = { count: async () => 0 }
    expect(() => assertValidSource(partial, 'partial')).toThrow(/scan/)
    expect(() => assertValidSource(partial, 'partial')).toThrow(/normalise/)
  })

  it('narrows the type so the compiler treats the value as LegacySource<T>', () => {
    // This test is a compile-time proof; if it builds, the assertion works.
    const candidate: unknown = makeValidSource()
    assertValidSource<{ id: string }>(candidate, 'type-narrowing-check')
    // After the assertion, TypeScript knows candidate is LegacySource<{id:string}>.
    expect(typeof candidate.count).toBe('function')
  })
})
