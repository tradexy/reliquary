#!/usr/bin/env node
/**
 * CLI entry point.
 *
 *   npm run verify:bundle -- ./packages/core/data/bundle.json
 *   npm run verify:bundle -- ./bundle.json --fingerprint 7f2d... --json
 *
 * Exit codes: 0 clean, 1 findings, 2 usage or read error.
 */

import { verifyBundleFile, formatReport, jsonReport } from './verify.js'

async function main(argv: string[]): Promise<number> {
  const args = argv.slice(2)
  const json = args.includes('--json')
  const path = args.find((a) => !a.startsWith('--'))
  const fpIndex = args.indexOf('--fingerprint')
  const expectFingerprint = fpIndex >= 0 ? args[fpIndex + 1] : undefined

  if (!path) {
    console.error('usage: verify-bundle <bundle.json> [--fingerprint <hex>] [--json]')
    return 2
  }

  try {
    const { result, bundle } = await verifyBundleFile(path, { expectFingerprint })
    console.log(json ? JSON.stringify(jsonReport(result, bundle), null, 2) : formatReport(result, bundle))
    return result.ok ? 0 : 1
  } catch (error) {
    console.error(`could not verify ${path}: ${(error as Error).message}`)
    return 2
  }
}

main(process.argv).then((code) => {
  process.exit(code)
})
