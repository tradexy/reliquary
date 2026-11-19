/**
 * Coverage matrix: one row per catalogue entry, saying whether a test proves it.
 *
 * Reading test files from disk is not possible in a browser bundle, so the
 * caller injects `knownRefs`: test file path -> the refs that file contains,
 * e.g. 'capture/catalogue.test.ts' -> ['capture/catalogue.test.ts#roles.grant'].
 */

import { CATALOGUE } from './catalogue.js';
import type { CatalogueEntry, FailMode } from './catalogue.js';

export type KnownRefs = ReadonlyMap<string, readonly string[]>;

export interface CoverageRow {
  id: string;
  area: CatalogueEntry['area'];
  failMode: FailMode;
  testRef: string;
  tested: boolean;
  gap: string | null;
}

export function buildCoverage(
  knownRefs: KnownRefs,
  catalogue: readonly CatalogueEntry[] = CATALOGUE,
): CoverageRow[] {
  return catalogue.map((entry) => {
    const file = entry.testRef.split('#')[0] ?? '';
    const refs = knownRefs.get(file);
    let gap: string | null = null;
    if (refs === undefined) gap = `no known test file "${file}"`;
    else if (!refs.includes(entry.testRef)) gap = `"${file}" has no entry for ${entry.testRef}`;
    return {
      id: entry.id,
      area: entry.area,
      failMode: entry.failMode,
      testRef: entry.testRef,
      tested: gap === null,
      gap,
    };
  });
}
