/**
 * Tests for chain/append.ts
 *
 * Covers:
 *   - Linkage: each appended event's prevHash matches the previous event's hash.
 *   - Freezing: returned events and the events() snapshot cannot be mutated.
 *   - Rejection of caller-supplied seq / prevHash / hash.
 *   - Rejection of unregistered action ids.
 *   - head() returns the last event or null for an empty log.
 *   - Concurrent appends produce a single linear chain with contiguous seqs.
 *   - Property-based: linkage holds for any sequence of drafts.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createLog, GENESIS_PREV_HASH } from './append.js';
import type { AppendDraft } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FIXED_AT = '2024-01-01T00:00:00.000Z';

/** Minimal valid draft using a registered catalogue action. */
function draft(overrides: Partial<AppendDraft> = {}): AppendDraft {
  return {
    at: FIXED_AT,
    actor: { id: 'alice', role: 'admin' },
    action: 'roles.grant',
    subject: 'bob',
    outcome: 'committed',
    lawful: 'none',
    detail: {},
    ...overrides,
  };
}

function makeLog() {
  return createLog({ formatVersion: 'anchora/1' });
}

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('createLog — basic append', () => {
  it('first event gets seq=1 and prevHash equal to the genesis sentinel', async () => {
    const log = makeLog();
    const ev = await log.append(draft());
    expect(ev.seq).toBe(1);
    expect(ev.prevHash).toBe(GENESIS_PREV_HASH);
  });

  it('second event gets seq=2 and prevHash equal to first event hash', async () => {
    const log = makeLog();
    const ev1 = await log.append(draft());
    const ev2 = await log.append(draft());
    expect(ev2.seq).toBe(2);
    expect(ev2.prevHash).toBe(ev1.hash);
  });

  it('hash is a 64-character hex string', async () => {
    const log = makeLog();
    const ev = await log.append(draft());
    expect(ev.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('two events with identical payloads produce different hashes (seq differs)', async () => {
    const log = makeLog();
    const ev1 = await log.append(draft());
    const ev2 = await log.append(draft());
    expect(ev1.hash).not.toBe(ev2.hash);
  });
});

describe('createLog — head()', () => {
  it('head() returns null on an empty log', () => {
    const log = makeLog();
    expect(log.head()).toBeNull();
  });

  it('head() returns the last appended event', async () => {
    const log = makeLog();
    const ev1 = await log.append(draft());
    expect(log.head()).toBe(ev1);
    const ev2 = await log.append(draft());
    expect(log.head()).toBe(ev2);
  });
});

describe('createLog — events()', () => {
  it('events() returns all appended events in order', async () => {
    const log = makeLog();
    await log.append(draft({ subject: 'one' }));
    await log.append(draft({ subject: 'two' }));
    const evs = log.events();
    expect(evs).toHaveLength(2);
    expect(evs[0]!.subject).toBe('one');
    expect(evs[1]!.subject).toBe('two');
  });
});

describe('createLog — freezing', () => {
  it('returned event is frozen', async () => {
    const log = makeLog();
    const ev = await log.append(draft());
    expect(Object.isFrozen(ev)).toBe(true);
  });

  it('mutating a returned event throws in strict mode', async () => {
    const log = makeLog();
    const ev = await log.append(draft());
    expect(() => {
      // Intentional mutation attempt; the object is frozen at runtime.
      ;(ev as { seq: number }).seq = 999;
    }).toThrow();
  });

  it('events() snapshot is frozen', async () => {
    const log = makeLog();
    await log.append(draft());
    const evs = log.events();
    expect(Object.isFrozen(evs)).toBe(true);
  });

  it('events in the snapshot are frozen', async () => {
    const log = makeLog();
    await log.append(draft());
    const evs = log.events();
    expect(Object.isFrozen(evs[0])).toBe(true);
  });

  it('mutating the snapshot array does not affect the internal store', async () => {
    const log = makeLog();
    await log.append(draft());
    const snap1 = log.events();
    // Attempting to push onto a frozen array throws — that proves isolation.
    expect(() => {
      (snap1 as AuditEvent[]).push(snap1[0]!);
    }).toThrow();
    expect(log.events()).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Rejection of caller-supplied computed fields
// ---------------------------------------------------------------------------

describe('createLog — rejection of caller-supplied computed fields', () => {
  it('throws if draft contains seq', async () => {
    const log = makeLog();
    await expect(
      log.append({ ...draft(), seq: 1 } as unknown as AppendDraft),
    ).rejects.toThrow(/seq/);
  });

  it('throws if draft contains prevHash', async () => {
    const log = makeLog();
    await expect(
      log.append({ ...draft(), prevHash: '0'.repeat(64) } as unknown as AppendDraft),
    ).rejects.toThrow(/prevHash/);
  });

  it('throws if draft contains hash', async () => {
    const log = makeLog();
    await expect(
      log.append({ ...draft(), hash: '0'.repeat(64) } as unknown as AppendDraft),
    ).rejects.toThrow(/hash/);
  });
});

// ---------------------------------------------------------------------------
// Rejection of unknown actions
// ---------------------------------------------------------------------------

describe('createLog — catalogue enforcement', () => {
  it('throws for an action not in the catalogue', async () => {
    const log = makeLog();
    await expect(
      log.append(draft({ action: 'not.a.real.action' })),
    ).rejects.toThrow(/Unregistered action/);
  });

  it('accepts every registered catalogue action', async () => {
    const { CATALOGUE } = await import('../capture/catalogue.js');
    const log = makeLog();
    for (const entry of CATALOGUE) {
      await expect(log.append(draft({ action: entry.id }))).resolves.toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Concurrent appends
// ---------------------------------------------------------------------------

describe('createLog — concurrent appends', () => {
  it('10 concurrent appends produce a single linear chain with seqs 1–10', async () => {
    const log = makeLog();
    // Fire all 10 appends without awaiting — they must serialise internally.
    const promises = Array.from({ length: 10 }, (_, i) =>
      log.append(draft({ subject: `item-${i}` })),
    );
    const events = await Promise.all(promises);
    // All 10 must have resolved to events.
    expect(events).toHaveLength(10);

    const stored = log.events();
    // Contiguous seqs 1–10.
    expect(stored.map((e) => e.seq)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    // Each prevHash matches the previous hash.
    for (let i = 1; i < stored.length; i++) {
      expect(stored[i]!.prevHash).toBe(stored[i - 1]!.hash);
    }
  });

  it('50 concurrent appends produce a contiguous, linked chain', async () => {
    const log = makeLog();
    await Promise.all(
      Array.from({ length: 50 }, (_, i) => log.append(draft({ subject: `x-${i}` }))),
    );
    const stored = log.events();
    expect(stored).toHaveLength(50);
    for (let i = 1; i < stored.length; i++) {
      expect(stored[i]!.prevHash).toBe(stored[i - 1]!.hash);
      expect(stored[i]!.seq).toBe(i + 1);
    }
  });
});

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

type AuditEvent = Awaited<ReturnType<ReturnType<typeof createLog>['append']>>;

describe('createLog — property tests', () => {
  it('linkage holds for any sequence of valid drafts (append a few at a time)', async () => {
    // We generate a small count per run to keep the suite fast while still
    // testing the invariant across varied sequences.
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.constant(null), { minLength: 1, maxLength: 20 }),
        async (items) => {
          const log = makeLog();
          const { CATALOGUE } = await import('../capture/catalogue.js');
          const actions = CATALOGUE.map((e) => e.id);

          for (let i = 0; i < items.length; i++) {
            const action = actions[i % actions.length]!;
            await log.append(draft({ action, subject: `s-${i}` }));
          }

          const evs = log.events();
          expect(evs).toHaveLength(items.length);

          // seq starts at 1 and increments by 1.
          for (let i = 0; i < evs.length; i++) {
            expect(evs[i]!.seq).toBe(i + 1);
          }

          // prevHash chain is correct.
          expect(evs[0]!.prevHash).toBe(GENESIS_PREV_HASH);
          for (let i = 1; i < evs.length; i++) {
            expect(evs[i]!.prevHash).toBe(evs[i - 1]!.hash);
          }

          // All events are frozen.
          for (const ev of evs) {
            expect(Object.isFrozen(ev)).toBe(true);
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it('concurrent appends always produce a linear chain (property)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 20 }),
        async (n) => {
          const log = makeLog();
          await Promise.all(
            Array.from({ length: n }, (_, i) => log.append(draft({ subject: `c-${i}` }))),
          );
          const evs = log.events();
          expect(evs).toHaveLength(n);
          for (let i = 1; i < evs.length; i++) {
            expect(evs[i]!.prevHash).toBe(evs[i - 1]!.hash);
          }
        },
      ),
      { numRuns: 30 },
    );
  });
});
