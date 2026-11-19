import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { verifyChain } from '../packages/core/src/chain/verify.js'
import { webcrypto } from 'node:crypto'

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
}

const b = JSON.parse(await readFile(join(process.cwd(), 'packages/core/data/bundle.json'), 'utf8'))
const t0 = performance.now()
const r = await verifyChain({ formatVersion: b.formatVersion, events: b.events, seals: b.seals, anchors: b.anchors }, b.publicKeyPem, b.keyFingerprint)
console.log('ms', Math.round(performance.now() - t0), 'ok', r.ok, 'findings', r.findings.length)
