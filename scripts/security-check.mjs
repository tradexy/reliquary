#!/usr/bin/env node
/**
 * Deterministic source-level security & policy check.
 *
 * Enforces the mechanical rules in `.kiro/steering/security.md` plus
 * Requirement 14 (no "tamper-proof" overclaims in UI/site copy) and
 * Requirement 15 (no external font/CDN URLs), so a violation fails the build
 * instead of relying on review discipline.
 *
 * Exits 1 on any finding. Prints every finding with file and line.
 */

import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const ROOTS = ['packages', 'apps', 'tools', 'site']
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.git'])
const EXTENSIONS = /\.(ts|tsx|js|jsx|html)$/

const RULES = [
  { id: 'eval', pattern: /\beval\s*\(/, message: 'eval() is forbidden' },
  { id: 'new-function', pattern: /new\s+Function\s*\(/, message: 'new Function() is forbidden' },
  {
    id: 'inner-html',
    pattern: /dangerouslySetInnerHTML|\.innerHTML\s*=|\.outerHTML\s*=|document\.write\s*\(/,
    message: 'HTML injection sink is forbidden',
  },
  { id: 'storage', pattern: /\b(localStorage|sessionStorage)\b/, message: 'Web storage is forbidden for records' },
  { id: 'aws-key', pattern: /AKIA[0-9A-Z]{16}/, message: 'Possible AWS access key' },
  { id: 'github-token', pattern: /gh[pousr]_[A-Za-z0-9]{20,}/, message: 'Possible GitHub token' },
  { id: 'openai-key', pattern: /sk-[A-Za-z0-9]{20,}/, message: 'Possible API key' },
  {
    id: 'external-asset',
    pattern: /https?:\/\/(?:fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr|unpkg\.com)/i,
    message: 'External font/CDN asset violates Requirement 15 (sealed runtime)',
  },
  {
    id: 'overclaim',
    pattern: /\btamper-proof\b/i,
    message: 'Overclaim "tamper-proof" violates Requirement 14 (use "tamper-evident")',
    onlyRoots: ['apps', 'site', 'packages'],
  },
]

const ALLOWLIST = new Set([
  'scripts/security-check.mjs',
])

async function* walk(dir) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(full)
    else if (EXTENSIONS.test(entry.name)) yield full
  }
}

const findings = []
let scanned = 0

for (const root of ROOTS) {
  for await (const file of walk(root)) {
    const rel = relative(process.cwd(), file)
    if (ALLOWLIST.has(rel)) continue
    scanned += 1
    const text = await readFile(file, 'utf8')
    const lines = text.split('\n')
    for (const rule of RULES) {
      if (rule.onlyRoots && !rule.onlyRoots.some((r) => rel.startsWith(`${r}/`))) continue
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i]
        const trimmed = line.trimStart()
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue
        if (rule.pattern.test(line)) {
          findings.push({ rule: rule.id, message: rule.message, file: rel, line: i + 1 })
        }
      }
    }
  }
}

if (findings.length === 0) {
  console.log(`security-check: clean (${scanned} files scanned)`)
  process.exit(0)
}

console.error(`security-check: ${findings.length} finding(s) in ${scanned} files`)
for (const f of findings) {
  console.error(`  ${f.file}:${f.line}  [${f.rule}] ${f.message}`)
}
process.exit(1)
