// Capture sub-package — catalogue, writers, coverage (Tasks 4, 9).
export type { FailMode, CatalogueEntry } from './catalogue.js';
export { CATALOGUE, CATALOGUE_MAP, requireCatalogueEntry } from './catalogue.js';
export { createCapture } from './writers.js';
export type {
  Capture,
  CaptureOptions,
  CaptureCounters,
  FlushResult,
  PerformResult,
} from './writers.js';
export { buildCoverage } from './coverage.js';
export type { CoverageRow, KnownRefs } from './coverage.js';
