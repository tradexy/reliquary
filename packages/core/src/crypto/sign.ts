/**
 * Ed25519 sign and verify over canonical payloads.
 *
 * The signature covers the canonical serialisation of the payload, so any field
 * mutation or key ordering change will invalidate it. This is the same canonical
 * function used for hashing, which ties the signature directly to the hash preimage.
 *
 * Encoding: signatures are base64 strings (64 bytes → 88 base64 chars).
 */

import * as ed from '@noble/ed25519';
import { canonical } from './canonical.js';
import { loadPrivateKey, loadPublicKey } from './keys.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sign a payload with an Ed25519 private key.
 *
 * The signed message is `canonical(payload)` encoded as UTF-8. Returns the
 * 64-byte signature encoded as a base64 string.
 */
export async function signPayload(
  payload: unknown,
  privateKeyPem: string,
): Promise<string> {
  const message = encodeMessage(payload);
  const privateKeyBytes = loadPrivateKey(privateKeyPem);
  const signatureBytes = await ed.signAsync(message, privateKeyBytes);
  return bytesToBase64(signatureBytes);
}

/**
 * Verify an Ed25519 signature over a payload.
 *
 * Returns `true` only if the signature was produced by the private key
 * corresponding to `publicKeyPem` over `canonical(payload)`.
 */
export async function verifyPayload(
  payload: unknown,
  signature: string,
  publicKeyPem: string,
): Promise<boolean> {
  try {
    const message = encodeMessage(payload);
    const signatureBytes = base64ToBytes(signature);
    const publicKeyBytes = loadPublicKey(publicKeyPem);
    return await ed.verifyAsync(signatureBytes, message, publicKeyBytes);
  } catch {
    // Any decoding or structural error means the signature is invalid.
    return false;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function encodeMessage(payload: unknown): Uint8Array {
  return new TextEncoder().encode(canonical(payload));
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
