/**
 * Evidence bundle export (anchora/1).
 *
 * The bundle is what the offline verifier reads. buildBundle() copies its
 * inputs, so later changes to the live log cannot alter an exported file.
 * Time is injected as `exportedAt`.
 */

import type { Anchor, AuditEvent, Seal } from '../chain/types.js';
import { FORMAT_VERSION } from '../format.js';
import type { ControlResult } from './standards.js';

export interface LawfulManifestEntry {
  seq: number;
  kind: Exclude<AuditEvent['lawful'], 'none'>;
  /** The actor id, which is what the verifier treats as the authority. */
  authority: string;
}

export interface BundleControl {
  standard: string;
  control: string;
  eventSeqs: number[];
}

export interface EvidenceBundle {
  formatVersion: typeof FORMAT_VERSION;
  exportedAt: string;
  publicKeyPem: string;
  keyFingerprint: string;
  events: AuditEvent[];
  seals: Seal[];
  anchors: Anchor[];
  lawfulManifest: LawfulManifestEntry[];
  controls: BundleControl[];
}

export interface BuildBundleInput {
  events: readonly AuditEvent[];
  seals: readonly Seal[];
  anchors: readonly Anchor[];
  publicKeyPem: string;
  keyFingerprint: string;
  controls: readonly ControlResult[];
  exportedAt: string;
}

export function buildBundle(input: BuildBundleInput): EvidenceBundle {
  const events = input.events.map((e) => ({ ...e, actor: { ...e.actor }, detail: { ...e.detail } }));
  const lawfulManifest: LawfulManifestEntry[] = [];
  for (const e of events) {
    if (e.lawful !== 'none') {
      lawfulManifest.push({ seq: e.seq, kind: e.lawful, authority: e.actor.id });
    }
  }
  return {
    formatVersion: FORMAT_VERSION,
    exportedAt: input.exportedAt,
    publicKeyPem: input.publicKeyPem,
    keyFingerprint: input.keyFingerprint,
    events,
    seals: input.seals.map((s) => ({ ...s })),
    anchors: input.anchors.map((a) => ({ ...a })),
    lawfulManifest,
    controls: input.controls.map((c) => ({
      standard: c.standard,
      control: c.control,
      eventSeqs: [...c.eventSeqs],
    })),
  };
}

export interface BundleSummary {
  events: number;
  seals: number;
  anchors: number;
  lawfulChanges: number;
  controls: number;
  keyFingerprint: string;
}

/** Counts are recomputed from the arrays, never read from a stored field. */
export function summary(bundle: EvidenceBundle): BundleSummary {
  return {
    events: bundle.events.length,
    seals: bundle.seals.length,
    anchors: bundle.anchors.length,
    lawfulChanges: bundle.events.filter((e) => e.lawful !== 'none').length,
    controls: bundle.controls.length,
    keyFingerprint: bundle.keyFingerprint,
  };
}
