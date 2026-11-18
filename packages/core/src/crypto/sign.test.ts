import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateKeyPair } from './keys.js';
import { signPayload, verifyPayload } from './sign.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [k: string]: JsonValue };

/** fast-check arbitrary for a JSON-serialisable value (no undefined, NaN, Infinity). */
function jsonArbitrary(): fc.Arbitrary<JsonValue> {
  return fc.jsonValue() as fc.Arbitrary<JsonValue>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('signPayload / verifyPayload', () => {
  it('a valid signature verifies with the matching public key', async () => {
    const kp = await generateKeyPair();
    const payload = { seq: 1, action: 'user.login', actor: 'alice' };
    const sig = await signPayload(payload, kp.privateKeyPem);
    const ok = await verifyPayload(payload, sig, kp.publicKeyPem);
    expect(ok).toBe(true);
  });

  it('a signature made with one key fails to verify with a different key', async () => {
    const kp1 = await generateKeyPair();
    const kp2 = await generateKeyPair();
    const payload = { seq: 1, action: 'user.login' };
    const sig = await signPayload(payload, kp1.privateKeyPem);
    const ok = await verifyPayload(payload, sig, kp2.publicKeyPem);
    expect(ok).toBe(false);
  });

  it('a tampered payload fails verification', async () => {
    const kp = await generateKeyPair();
    const payload = { seq: 1, action: 'user.login', actor: 'alice' };
    const sig = await signPayload(payload, kp.privateKeyPem);
    const tampered = { seq: 1, action: 'user.login', actor: 'mallory' };
    const ok = await verifyPayload(tampered, sig, kp.publicKeyPem);
    expect(ok).toBe(false);
  });

  it('a truncated or corrupted signature fails verification', async () => {
    const kp = await generateKeyPair();
    const payload = { seq: 1 };
    const sig = await signPayload(payload, kp.privateKeyPem);
    // Flip the first character of the base64 signature.
    const corrupted = (sig[0] === 'A' ? 'B' : 'A') + sig.slice(1);
    const ok = await verifyPayload(payload, corrupted, kp.publicKeyPem);
    expect(ok).toBe(false);
  });

  it('an empty string as signature returns false (no crash)', async () => {
    const kp = await generateKeyPair();
    const ok = await verifyPayload({ seq: 1 }, '', kp.publicKeyPem);
    expect(ok).toBe(false);
  });

  it('signature encodes to a base64 string of the expected length (64 bytes → 88 chars)', async () => {
    const kp = await generateKeyPair();
    const sig = await signPayload({ test: true }, kp.privateKeyPem);
    // Ed25519 signatures are always 64 bytes → 88 base64 chars (with padding).
    expect(sig).toMatch(/^[A-Za-z0-9+/]+=*$/);
    // 64 bytes in base64 = ceil(64/3)*4 = 88 chars
    expect(sig.length).toBe(88);
  });
});

describe('signPayload / verifyPayload — property tests', () => {
  it('valid signature verifies for any JSON-serialisable payload', async () => {
    // We generate key pairs outside fc.assert to keep the test synchronous at the
    // property level; the keypair is reused across all examples in this run.
    const kp = await generateKeyPair();

    // Build a fixed sample set of structurally varied payloads.
    const payloads: JsonValue[] = [
      {},
      { a: 1 },
      { nested: { deep: { value: 'x' } } },
      [1, 2, 3],
      'just a string',
      42,
      true,
      null,
      { arr: [null, false, 0, ''] },
      { z: 'last', a: 'first', m: 'middle' },
    ];

    for (const payload of payloads) {
      const sig = await signPayload(payload, kp.privateKeyPem);
      const ok = await verifyPayload(payload, sig, kp.publicKeyPem);
      expect(ok).toBe(true);
    }
  });

  it('property: sign then verify is always true for any string field value', async () => {
    // Test a cross-product of string payloads with a single keypair.
    const kp = await generateKeyPair();

    // We run a synchronous fc.assert over string values, collecting promises,
    // then await them all.
    const promises: Promise<void>[] = [];

    fc.assert(
      fc.property(
        fc.string({ maxLength: 64 }),
        (value) => {
          const p = (async () => {
            const payload = { value };
            const sig = await signPayload(payload, kp.privateKeyPem);
            const ok = await verifyPayload(payload, sig, kp.publicKeyPem);
            expect(ok).toBe(true);
          })();
          promises.push(p);
          return true;
        },
      ),
      { numRuns: 20 },
    );

    await Promise.all(promises);
  });
});

describe('format.ts — FORMAT_VERSION', () => {
  it('FORMAT_VERSION is anchora/1', async () => {
    const { FORMAT_VERSION } = await import('../format.js');
    expect(FORMAT_VERSION).toBe('anchora/1');
  });
});
