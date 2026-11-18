/**
 * Ed25519 key generation and PEM encoding.
 *
 * "PEM" here means the standard header/footer with base64-encoded raw key bytes —
 * honest about what it contains, compatible with the offline verifier.
 *
 * Key storage is intentionally outside the event store (see design.md §Seals).
 * The apps receive only the public key and fingerprint; they never see the private key.
 *
 * Uses globalThis.crypto.subtle for SHA-256 (fingerprint) so this module is
 * browser-safe. The @noble/ed25519 library handles key generation and derivation.
 */

import * as ed from '@noble/ed25519';
import { sha256Hex } from './hash.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KeyPair {
  /** PEM-encoded 32-byte Ed25519 private (seed) key. */
  privateKeyPem: string;
  /** PEM-encoded 32-byte Ed25519 public key. */
  publicKeyPem: string;
  /**
   * Lowercase hex SHA-256 of the raw public key bytes, truncated to 32 characters.
   * Used as `keyId` in seal records.
   */
  fingerprint: string;
}

// ---------------------------------------------------------------------------
// PEM labels (honest, not X.509 SubjectPublicKeyInfo — just raw bytes in PEM)
// ---------------------------------------------------------------------------

const PRIV_HEADER = '-----BEGIN ED25519 PRIVATE KEY-----';
const PRIV_FOOTER = '-----END ED25519 PRIVATE KEY-----';
const PUB_HEADER = '-----BEGIN ED25519 PUBLIC KEY-----';
const PUB_FOOTER = '-----END ED25519 PUBLIC KEY-----';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a fresh Ed25519 keypair. Returns PEM-encoded keys and a fingerprint.
 * The fingerprint is lowercase hex SHA-256 of the raw 32-byte public key,
 * truncated to 32 characters.
 */
export async function generateKeyPair(): Promise<KeyPair> {
  const privateKeyBytes = ed.utils.randomPrivateKey();
  const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);
  return buildKeyPair(privateKeyBytes, publicKeyBytes);
}

/**
 * Derive the public key PEM and fingerprint from a private key PEM.
 * The private key is never stored beyond this call.
 */
export async function publicKeyFromPrivate(
  privateKeyPem: string,
): Promise<{ publicKeyPem: string; fingerprint: string }> {
  const privateKeyBytes = pemToBytes(privateKeyPem, PRIV_HEADER, PRIV_FOOTER);
  const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);
  const fingerprint = await fingerprintFromBytes(publicKeyBytes);
  return { publicKeyPem: bytesToPem(publicKeyBytes, PUB_HEADER, PUB_FOOTER), fingerprint };
}

/**
 * Load a public key PEM and return its raw bytes, ready for `verifyAsync`.
 */
export function loadPublicKey(publicKeyPem: string): Uint8Array {
  return pemToBytes(publicKeyPem, PUB_HEADER, PUB_FOOTER);
}

/**
 * Load a private key PEM and return its raw bytes, ready for `signAsync`.
 */
export function loadPrivateKey(privateKeyPem: string): Uint8Array {
  return pemToBytes(privateKeyPem, PRIV_HEADER, PRIV_FOOTER);
}

/**
 * Derive the keyId (fingerprint) from a public key PEM.
 */
export async function keyIdFromPublicKey(publicKeyPem: string): Promise<string> {
  const bytes = loadPublicKey(publicKeyPem);
  return fingerprintFromBytes(bytes);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function buildKeyPair(
  privateKeyBytes: Uint8Array,
  publicKeyBytes: Uint8Array,
): Promise<KeyPair> {
  const fingerprint = await fingerprintFromBytes(publicKeyBytes);
  return {
    privateKeyPem: bytesToPem(privateKeyBytes, PRIV_HEADER, PRIV_FOOTER),
    publicKeyPem: bytesToPem(publicKeyBytes, PUB_HEADER, PUB_FOOTER),
    fingerprint,
  };
}

async function fingerprintFromBytes(publicKeyBytes: Uint8Array): Promise<string> {
  // sha256Hex returns a 64-char hex string; we take the first 32 chars as keyId.
  const fullHex = await sha256Hex(bytesToBase64(publicKeyBytes));
  return fullHex.slice(0, 32);
}

function bytesToPem(bytes: Uint8Array, header: string, footer: string): string {
  const b64 = bytesToBase64(bytes);
  // Wrap at 64 characters per line, standard PEM convention.
  const lines = b64.match(/.{1,64}/g) ?? [];
  return [header, ...lines, footer].join('\n');
}

function pemToBytes(pem: string, header: string, footer: string): Uint8Array {
  const lines = pem
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l !== header && l !== footer);
  const b64 = lines.join('');
  return base64ToBytes(b64);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
