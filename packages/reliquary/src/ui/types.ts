/**
 * Shared UI types consumed by the shell components.
 *
 * These types are intentionally thin — they describe presentation shapes, not
 * domain shapes. The kit never knows what a catalogue card or ledger entry is.
 */

import type { Theme } from './theme.js'
import type { Repository } from '../repository/memory.js'

/** A single label/value pair within a RecordSection. */
export interface RecordField {
  label: string
  value: string | number | null
}

/** A named group of fields rendered in one block on the Record screen. */
export interface RecordSection {
  heading: string
  fields: RecordField[]
}

/** The three-part summary rendered in each Search result row. */
export interface RecordSummary {
  /** Row title — the primary identifying text. Truncated if long. */
  primary: string
  /** Supporting identity line shown beneath primary in muted ink. Optional. */
  secondary?: string
  /** Right-aligned meta value rendered in mono (e.g. year, quantity). Optional. */
  meta?: string
}

/**
 * Configuration for a Reliquary app instance.
 *
 * T is the domain record type produced by the adapter (e.g. CatalogueCard).
 * Apps supply this once at the entry point; the shell is parameterised by it.
 */
export interface AppConfig<T> {
  /** Application title shown in the header. */
  title: string
  /** Subtitle / tagline shown beneath the title. */
  subtitle: string
  /** Fields of T that are included in full-text search. */
  searchFields: Array<keyof T & string>
  /** Convert one domain record into sections of label/value pairs for display. */
  renderRecord(record: T): RecordSection[]
  /**
   * Produce a three-part summary for one record as rendered in the Search list.
   * primary is required; secondary and meta are optional.
   */
  renderSummary(record: T): RecordSummary
  /** Visual theme applied to the entire app. */
  theme: Theme
}
