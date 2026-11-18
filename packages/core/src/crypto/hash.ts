/**
 * SHA-256 hashing over the canonical serialisation string.
 *
 * Uses globalThis.crypto.subtle — available in Node ≥ 20 and all modern browsers.
 * No node:crypto import so this module is safe to bundle for the browser.
 */

/**
 * Returns the lowercase hex SHA-256 digest of the UTF-8 encoding of `input`.
 */
export async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const buffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  return bufferToHex(buffer);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}
