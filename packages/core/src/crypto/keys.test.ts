import { describe, it, expect } from 'vitest';
import { generateKeyPair, loadPublicKey, loadPrivateKey, keyIdFromPublicKey } from './keys.js';

describe('generateKeyPair', () => {
  it('returns a privateKeyPem, publicKeyPem and fingerprint', async () => {
    const kp = await generateKeyPair();
    expect(kp.privateKeyPem).toContain('-----BEGIN ED25519 PRIVATE KEY-----');
    expect(kp.publicKeyPem).toContain('-----BEGIN ED25519 PUBLIC KEY-----');
    expect(kp.fingerprint).toMatch(/^[0-9a-f]{32}$/);
  });

  it('fingerprint is stable across two derivations of the same key', async () => {
    // Generate a keypair, reload it and re-derive the fingerprint.
    const kp = await generateKeyPair();
    const fp2 = await keyIdFromPublicKey(kp.publicKeyPem);
    expect(fp2).toBe(kp.fingerprint);
  });

  it('different keypairs give different fingerprints', async () => {
    const kp1 = await generateKeyPair();
    const kp2 = await generateKeyPair();
    expect(kp1.fingerprint).not.toBe(kp2.fingerprint);
    expect(kp1.publicKeyPem).not.toBe(kp2.publicKeyPem);
  });

  it('fingerprint is exactly 32 lowercase hex chars', async () => {
    for (let i = 0; i < 5; i++) {
      const kp = await generateKeyPair();
      expect(kp.fingerprint).toHaveLength(32);
      expect(kp.fingerprint).toMatch(/^[0-9a-f]{32}$/);
    }
  });
});

describe('loadPublicKey / loadPrivateKey', () => {
  it('roundtrips a public key through PEM encoding', async () => {
    const kp = await generateKeyPair();
    const bytes = loadPublicKey(kp.publicKeyPem);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.byteLength).toBe(32);
  });

  it('roundtrips a private key through PEM encoding', async () => {
    const kp = await generateKeyPair();
    const bytes = loadPrivateKey(kp.privateKeyPem);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.byteLength).toBe(32);
  });
});

describe('keyIdFromPublicKey', () => {
  it('returns the same value as the fingerprint on the keypair', async () => {
    const kp = await generateKeyPair();
    const id = await keyIdFromPublicKey(kp.publicKeyPem);
    expect(id).toBe(kp.fingerprint);
  });
});
