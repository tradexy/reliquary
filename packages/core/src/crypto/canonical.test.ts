import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { canonical } from './canonical.js';

describe('canonical — key ordering', () => {
  it('produces the same string regardless of insertion order', () => {
    const a = canonical({ z: 1, a: 2, m: 3 });
    const b = canonical({ m: 3, z: 1, a: 2 });
    const c = canonical({ a: 2, m: 3, z: 1 });
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(a).toBe('{"a":2,"m":3,"z":1}');
  });

  it('sorts keys by code unit (uppercase before lowercase)', () => {
    // 'B' (66) < 'a' (97)
    expect(canonical({ a: 1, B: 2 })).toBe('{"B":2,"a":1}');
  });

  it('sorts nested object keys independently', () => {
    const result = canonical({ z: { b: 1, a: 2 }, a: { y: 3, x: 4 } });
    expect(result).toBe('{"a":{"x":4,"y":3},"z":{"a":2,"b":1}}');
  });
});

describe('canonical — whitespace', () => {
  it('contains no insignificant whitespace', () => {
    const result = canonical({ foo: 'bar', n: 42, flag: true });
    expect(result).not.toMatch(/\s/);
  });
});

describe('canonical — number guards', () => {
  it('normalises -0 to 0', () => {
    expect(canonical(-0)).toBe('0');
    expect(canonical(0)).toBe('0');
    expect(canonical({ v: -0 })).toBe('{"v":0}');
  });

  it('distinguishes 0 and 1 (sanity check)', () => {
    expect(canonical(0)).not.toBe(canonical(1));
  });

  it('rejects NaN', () => {
    expect(() => canonical(NaN)).toThrow(/NaN/);
  });

  it('rejects Infinity', () => {
    expect(() => canonical(Infinity)).toThrow(/Infinity/);
    expect(() => canonical(-Infinity)).toThrow(/Infinity/);
  });
});

describe('canonical — undefined', () => {
  it('rejects undefined at root with a clear message', () => {
    expect(() => canonical(undefined)).toThrow(/undefined/);
  });

  it('rejects undefined inside an object', () => {
    expect(() => canonical({ a: undefined })).toThrow(/undefined/);
  });

  it('rejects undefined inside an array', () => {
    expect(() => canonical([1, undefined, 3])).toThrow(/undefined/);
  });
});

describe('canonical — null', () => {
  it('preserves null at root', () => {
    expect(canonical(null)).toBe('null');
  });

  it('preserves null inside an object', () => {
    expect(canonical({ a: null })).toBe('{"a":null}');
  });
});

describe('canonical — rejected types', () => {
  it('rejects functions', () => {
    expect(() => canonical(() => {})).toThrow(/function/);
  });

  it('rejects symbols', () => {
    expect(() => canonical(Symbol('x'))).toThrow(/symbol/);
  });

  it('rejects bigints', () => {
    expect(() => canonical(BigInt(1))).toThrow(/bigint/);
  });
});

describe('canonical — unicode strings', () => {
  it('is stable for emoji and multi-byte characters', () => {
    const a = canonical({ msg: '🎃 audit' });
    const b = canonical({ msg: '🎃 audit' });
    expect(a).toBe(b);
  });

  it('JSON-escapes control characters', () => {
    const result = canonical('\u0000\u001f');
    expect(result).toBe('"\\u0000\\u001f"');
  });
});

describe('canonical — arrays', () => {
  it('preserves array order', () => {
    expect(canonical([3, 1, 2])).toBe('[3,1,2]');
  });

  it('round-trips nested structures', () => {
    const obj = { events: [{ seq: 1, actor: 'alice' }, { seq: 2, actor: 'bob' }] };
    const once = canonical(obj);
    const twice = canonical(obj);
    expect(once).toBe(twice);
  });
});

describe('canonical — property tests', () => {
  it('key order never changes the output', () => {
    // Build an object from a list of key-value pairs; reorder them; output must match.
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 8 }),
            fc.oneof(
              fc.integer(),
              fc.string(),
              fc.boolean(),
              fc.constant(null),
            ),
          ),
          { minLength: 1, maxLength: 8 },
        ),
        (pairs) => {
          // De-duplicate keys so Object.fromEntries is deterministic.
          const unique = [...new Map(pairs).entries()];
          const forward = Object.fromEntries(unique);
          const reversed = Object.fromEntries([...unique].reverse());
          return canonical(forward) === canonical(reversed);
        },
      ),
    );
  });

  it('single-character change to a string value changes the output', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.integer({ min: 0, max: 99 }),
        (str, idx) => {
          if (idx >= str.length) return true; // skip — index out of range
          const mutated =
            str.slice(0, idx) +
            String.fromCharCode((str.charCodeAt(idx) + 1) % 128) +
            str.slice(idx + 1);
          if (mutated === str) return true; // charcode wrap produced same char
          return canonical({ v: str }) !== canonical({ v: mutated });
        },
      ),
    );
  });
});
