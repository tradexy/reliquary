/**
 * Append-only chain log.
 *
 * createLog() returns a log handle with three methods:
 *   append(draft)  — compute seq / prevHash / hash and push a frozen event
 *   events()       — return a frozen copy of the event array
 *   head()         — return the last appended event, or null for an empty log
 *
 * Invariants enforced:
 *   1. draft must not carry seq, prevHash or hash — those are computed here.
 *   2. draft.action must exist in the catalogue.
 *   3. Concurrent calls serialise through a promise queue — no two appends
 *      compute prevHash simultaneously, so the chain is always linear.
 *   4. No existing event is ever mutated; every event in the store is frozen.
 */

import { canonical } from '../crypto/canonical.js';
import { sha256Hex } from '../crypto/hash.js';
import { requireCatalogueEntry } from '../capture/catalogue.js';
import type { AuditEvent, AppendDraft } from './types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LogOptions {
  formatVersion: string;
  /** Pre-populate the log with existing events (e.g. when replaying a bundle). */
  events?: readonly AuditEvent[];
}

export interface Log {
  /** Append a draft event. Returns the frozen, fully-computed AuditEvent. */
  append(draft: AppendDraft): Promise<AuditEvent>;
  /** Return a frozen snapshot of all events in the log. */
  events(): readonly AuditEvent[];
  /** Return the most recently appended event, or null if the log is empty. */
  head(): AuditEvent | null;
}

// ---------------------------------------------------------------------------
// Sentinel prevHash for the genesis event (seq 1)
// ---------------------------------------------------------------------------

export const GENESIS_PREV_HASH = '0'.repeat(64);

// ---------------------------------------------------------------------------
// Guard: reject drafts that carry computed fields
// ---------------------------------------------------------------------------

function rejectComputedFields(draft: AppendDraft): void {
  // Cast to access fields that callers should not have supplied.
  const raw = draft as Record<string, unknown>;
  if ('seq' in raw) {
    throw new TypeError('append: draft must not contain "seq" — it is assigned by the log.');
  }
  if ('prevHash' in raw) {
    throw new TypeError('append: draft must not contain "prevHash" — it is assigned by the log.');
  }
  if ('hash' in raw) {
    throw new TypeError('append: draft must not contain "hash" — it is assigned by the log.');
  }
}

// ---------------------------------------------------------------------------
// Hash computation
// ---------------------------------------------------------------------------

async function computeEventHash(event: Omit<AuditEvent, 'hash'>): Promise<string> {
  // Per design.md: hash = sha256(canonical({...event, hash: undefined}))
  // canonical() rejects undefined values, so we build a plain object without
  // the hash key rather than setting it to undefined.
  const preimage: Record<string, unknown> = {
    seq: event.seq,
    at: event.at,
    actor: event.actor,
    action: event.action,
    subject: event.subject,
    outcome: event.outcome,
    lawful: event.lawful,
    detail: event.detail,
    prevHash: event.prevHash,
  };
  return sha256Hex(canonical(preimage));
}

// ---------------------------------------------------------------------------
// createLog
// ---------------------------------------------------------------------------

export function createLog(options: LogOptions): Log {
  const { formatVersion } = options;
  void formatVersion; // used by callers for bundle assembly; retained for future validation

  // Internal mutable store — never exposed directly.
  const store: AuditEvent[] = [];

  // Seed from pre-existing events when replaying a bundle.
  if (options.events) {
    for (const ev of options.events) {
      store.push(Object.freeze({ ...ev }));
    }
  }

  // Serialisation queue — ensures concurrent appends produce one linear chain.
  let tail: Promise<unknown> = Promise.resolve();

  // ---------------------------------------------------------------------------
  // append
  // ---------------------------------------------------------------------------

  function append(draft: AppendDraft): Promise<AuditEvent> {
    // Enqueue this append after the current tail. Each call returns a promise
    // that resolves only after the previous append completes, so seq values
    // are contiguous and prevHash is always the correct previous hash.
    const result = tail.then(async () => {
      rejectComputedFields(draft);
      requireCatalogueEntry(draft.action);

      const seq = store.length + 1;
      const prevHash = store.length === 0 ? GENESIS_PREV_HASH : (store[store.length - 1]!.hash);

      // Build the full event minus hash, then compute hash over it.
      const partial: Omit<AuditEvent, 'hash'> = {
        seq,
        at: draft.at,
        actor: draft.actor,
        action: draft.action,
        subject: draft.subject,
        outcome: draft.outcome,
        lawful: draft.lawful,
        detail: draft.detail,
        prevHash,
      };

      const hash = await computeEventHash(partial);

      const event: AuditEvent = Object.freeze({ ...partial, hash });
      store.push(event);
      return event;
    });

    // Advance the tail — subsequent appends wait for this one.
    tail = result.catch(() => {
      // A rejected append must not block the queue.
    });

    return result;
  }

  // ---------------------------------------------------------------------------
  // events / head
  // ---------------------------------------------------------------------------

  function events(): readonly AuditEvent[] {
    // Return a frozen copy so callers cannot mutate the internal array.
    return Object.freeze([...store]);
  }

  function head(): AuditEvent | null {
    return store.length === 0 ? null : (store[store.length - 1] ?? null);
  }

  return { append, events, head };
}
