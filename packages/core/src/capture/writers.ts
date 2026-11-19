/**
 * Capture write path.
 *
 * createCapture() is the only way an auditable change is applied:
 *
 *   fail-closed  append first; if the store is unavailable, apply nothing and
 *                refuse. A widening action cannot commit without its event.
 *   queue        apply the change, hold the event in a durable outbox, and
 *                append it when flush() runs after the store recovers.
 *
 * `brokenStore` is a simulated outage switch. It is not a real storage fault
 * and the UI must label it as simulated.
 *
 * Time is injected (`now`); nothing here reads a clock or entropy source.
 */

import type { AppendDraft, AuditEvent } from '../chain/types.js';
import type { Log } from '../chain/append.js';
import type { CatalogueEntry } from './catalogue.js';

export type EventDetail = AuditEvent['detail'];
export type EventActor = AuditEvent['actor'];

export type PerformResult =
  | { outcome: 'committed'; event: AuditEvent }
  | { outcome: 'queued' }
  | { outcome: 'refused'; reason: 'audit-unavailable' };

export interface CaptureCounters {
  committedCount: number;
  refusedCount: number;
  queuedCount: number;
  flushedCount: number;
}

export interface FlushResult {
  flushed: number;
  remaining: number;
}

export interface CaptureOptions {
  log: Pick<Log, 'append'>;
  catalogue: readonly CatalogueEntry[];
  /** Simulated outage. A function lets a caller flip it while the capture lives. */
  brokenStore: boolean | (() => boolean);
  /** Injected ISO-8601 clock. */
  now: () => string;
}

export interface Capture {
  /**
   * Record an action. `change` is the real-world effect (grant a role, enable
   * a flag); it is called only when the action may proceed.
   * Throws RangeError for an action id that is not in the catalogue.
   */
  perform(
    actionId: string,
    subject: string,
    actor: EventActor,
    detail: EventDetail,
    change?: () => void,
  ): Promise<PerformResult>;
  counters(): CaptureCounters;
  /** Events waiting for the store, oldest first. */
  outbox(): readonly AppendDraft[];
  /** Append queued events in order. Stops at the first failure. */
  flush(): Promise<FlushResult>;
}

export function createCapture(options: CaptureOptions): Capture {
  const { log, catalogue, now } = options;
  const byId = new Map(catalogue.map((entry) => [entry.id, entry]));
  const isBroken = (): boolean =>
    typeof options.brokenStore === 'function' ? options.brokenStore() : options.brokenStore;

  const queue: AppendDraft[] = [];
  const count: CaptureCounters = {
    committedCount: 0,
    refusedCount: 0,
    queuedCount: 0,
    flushedCount: 0,
  };
  let flushing: Promise<FlushResult> | null = null;

  async function perform(
    actionId: string,
    subject: string,
    actor: EventActor,
    detail: EventDetail,
    change?: () => void,
  ): Promise<PerformResult> {
    const entry = byId.get(actionId);
    if (entry === undefined) {
      throw new RangeError(`Unregistered action "${actionId}".`);
    }

    const draft: AppendDraft = {
      at: now(),
      actor: { id: actor.id, role: actor.role },
      action: actionId,
      subject,
      outcome: entry.failMode === 'queue' ? 'queued' : 'committed',
      lawful: 'none',
      detail: { ...detail },
    };

    if (entry.failMode === 'fail-closed') {
      let event: AuditEvent;
      try {
        if (isBroken()) throw new Error('audit store unavailable');
        event = await log.append(draft);
      } catch {
        count.refusedCount += 1;
        return { outcome: 'refused', reason: 'audit-unavailable' };
      }
      change?.();
      count.committedCount += 1;
      return { outcome: 'committed', event };
    }

    change?.();
    queue.push(Object.freeze(draft));
    count.queuedCount += 1;
    return { outcome: 'queued' };
  }

  function flush(): Promise<FlushResult> {
    // One drain at a time, or two callers would append the same event twice.
    if (flushing !== null) return flushing;
    flushing = (async (): Promise<FlushResult> => {
      let flushed = 0;
      try {
        while (queue.length > 0 && !isBroken()) {
          try {
            await log.append(queue[0]!);
          } catch {
            break;
          }
          queue.shift();
          flushed += 1;
        }
      } finally {
        flushing = null;
      }
      count.flushedCount += flushed;
      return { flushed, remaining: queue.length };
    })();
    return flushing;
  }

  return {
    perform,
    counters: () => ({ ...count }),
    outbox: () => Object.freeze([...queue]),
    flush,
  };
}
