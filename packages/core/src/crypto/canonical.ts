/**
 * canonical(value): string
 *
 * Deterministic JSON serialisation used as the hash preimage for every audit event.
 * Rules:
 *   - Object keys sorted by UTF-16 code unit (the default string comparison order).
 *   - No insignificant whitespace.
 *   - Strings: standard JSON escaping.
 *   - Numbers: toString() with guards — NaN and ±Infinity are rejected; -0 is
 *     normalised to 0.
 *   - null: preserved as "null".
 *   - undefined: rejected with a clear error (a caller that passes undefined has a
 *     a bug; silent omission would change hashes unpredictably).
 *   - Containers: plain objects and arrays only.
 *   - Rejected types: function, symbol, bigint.
 *
 * Changing this function changes every hash ever produced. It is therefore versioned
 * via FORMAT_VERSION and has its own test suite.
 */

type Serialisable =
  | string
  | number
  | boolean
  | null
  | Serialisable[]
  | { [key: string]: Serialisable };

export function canonical(value: unknown): string {
  return serialise(value, '<root>');
}

function serialise(value: unknown, path: string): string {
  if (value === null) return 'null';

  if (value === undefined) {
    throw new TypeError(
      `canonical: undefined is not allowed (at ${path}). ` +
        'Omit the key or use null explicitly.',
    );
  }

  const type = typeof value;

  if (type === 'boolean') return value ? 'true' : 'false';

  if (type === 'number') {
    return serialiseNumber(value as number, path);
  }

  if (type === 'string') {
    return JSON.stringify(value as string);
  }

  if (type === 'function' || type === 'symbol') {
    throw new TypeError(
      `canonical: ${type} values cannot be serialised (at ${path}).`,
    );
  }

  if (type === 'bigint') {
    throw new TypeError(
      `canonical: bigint values cannot be serialised (at ${path}). ` +
        'Convert to string or number before passing to canonical.',
    );
  }

  if (Array.isArray(value)) {
    return serialiseArray(value, path);
  }

  if (type === 'object') {
    return serialiseObject(value as Record<string, unknown>, path);
  }

  // Exhaustive guard — should never be reached.
  throw new TypeError(`canonical: unexpected type "${type}" (at ${path}).`);
}

function serialiseNumber(n: number, path: string): string {
  if (Number.isNaN(n)) {
    throw new RangeError(
      `canonical: NaN cannot be serialised (at ${path}). ` +
        'Replace with null or a descriptive string.',
    );
  }
  if (!Number.isFinite(n)) {
    throw new RangeError(
      `canonical: Infinity cannot be serialised (at ${path}). ` +
        'Replace with null or a descriptive string.',
    );
  }
  // Object.is distinguishes -0 from 0; normalise to 0 so the hash is stable.
  if (Object.is(n, -0)) return '0';
  return n.toString();
}

function serialiseArray(arr: unknown[], path: string): string {
  const items = arr.map((item, i) => serialise(item, `${path}[${i}]`));
  return '[' + items.join(',') + ']';
}

function serialiseObject(obj: Record<string, unknown>, path: string): string {
  // Sort keys by code unit — identical to the default String comparison order.
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((key) => {
    const keyStr = JSON.stringify(key);
    const valStr = serialise(obj[key], `${path}.${key}`);
    return keyStr + ':' + valStr;
  });
  return '{' + pairs.join(',') + '}';
}
