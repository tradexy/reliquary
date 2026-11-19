/**
 * Create-only anchor store (Node only).
 *
 * The guarantee being modelled: a second write to the same anchor must be refused
 * by the store, not by the application. Here that is `open(path, 'wx')`, which the
 * filesystem refuses when the file exists. On S3 this is a conditional PUT into a
 * bucket with Object Lock in compliance mode; on Azure it is an immutable blob
 * policy. Those are simulated, and the UI says so.
 */

import { open, mkdir, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Anchor } from './types.js'

export type WriteResult = 'created' | 'exists'

/** Write an anchor, refusing to overwrite an existing one. */
export async function writeAnchorCreateOnly(dir: string, anchor: Anchor): Promise<WriteResult> {
  await mkdir(dir, { recursive: true })
  const path = join(dir, `anchor-${String(anchor.seq).padStart(6, '0')}.json`)
  let handle
  try {
    handle = await open(path, 'wx')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return 'exists'
    throw error
  }
  try {
    await handle.writeFile(`${JSON.stringify(anchor, null, 2)}\n`, 'utf8')
  } finally {
    await handle.close()
  }
  return 'created'
}

/** Read every anchor in the store, ordered by seq. */
export async function readAnchors(dir: string): Promise<Anchor[]> {
  const names = (await readdir(dir)).filter((n) => n.endsWith('.json')).sort()
  const anchors: Anchor[] = []
  for (const name of names) {
    anchors.push(JSON.parse(await readFile(join(dir, name), 'utf8')) as Anchor)
  }
  return anchors
}
