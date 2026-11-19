import { describe, it, expect } from 'vitest'
import { createLog } from '../chain/append.js'
import { FORMAT_VERSION } from '../format.js'
import { CATALOGUE } from './catalogue.js'
import { createCapture } from './writers.js'

const actor = { id: 'ravi.menon', role: 'security-lead' }
const now = (): string => '2026-11-01T09:00:00.000Z'

function setup(initiallyBroken = false) {
  const state = { broken: initiallyBroken }
  const log = createLog({ formatVersion: FORMAT_VERSION })
  const capture = createCapture({ log, catalogue: CATALOGUE, brokenStore: () => state.broken, now })
  return { state, log, capture }
}

describe('fail-closed path', () => {
  it('commits the event and applies the change when the store is healthy', async () => {
    const { log, capture } = setup()
    let applied = 0
    const r = await capture.perform('roles.grant', 'user:a', actor, { role: 'admin' }, () => { applied += 1 })
    expect(r.outcome).toBe('committed')
    expect(applied).toBe(1)
    expect(log.events()).toHaveLength(1)
    expect(capture.counters().committedCount).toBe(1)
  })

  it('refuses and applies nothing when the store is broken', async () => {
    const { log, capture } = setup(true)
    let applied = 0
    const r = await capture.perform('roles.grant', 'user:a', actor, {}, () => { applied += 1 })
    expect(r).toEqual({ outcome: 'refused', reason: 'audit-unavailable' })
    expect(applied).toBe(0)
    expect(log.events()).toHaveLength(0)
    expect(capture.counters().refusedCount).toBe(1)
  })

  it('refuses when the append itself throws', async () => {
    const capture = createCapture({
      log: { append: () => Promise.reject(new Error('disk full')) },
      catalogue: CATALOGUE,
      brokenStore: false,
      now,
    })
    let applied = 0
    const r = await capture.perform('agents.deploy', 'agent:x', actor, {}, () => { applied += 1 })
    expect(r.outcome).toBe('refused')
    expect(applied).toBe(0)
    expect(capture.counters().refusedCount).toBe(1)
  })
})

describe('queue path', () => {
  it('applies the change and queues the event during an outage', async () => {
    const { log, capture } = setup(true)
    let applied = 0
    const r = await capture.perform('roles.revoke', 'user:a', actor, { role: 'admin' }, () => { applied += 1 })
    expect(r).toEqual({ outcome: 'queued' })
    expect(applied).toBe(1)
    expect(log.events()).toHaveLength(0)
    expect(capture.outbox()).toHaveLength(1)
    expect(capture.outbox()[0]!.action).toBe('roles.revoke')
    expect(capture.counters().queuedCount).toBe(1)
  })

  it('flush keeps events queued while the store is still broken', async () => {
    const { capture } = setup(true)
    await capture.perform('roles.revoke', 'user:a', actor, {})
    expect(await capture.flush()).toEqual({ flushed: 0, remaining: 1 })
    expect(capture.outbox()).toHaveLength(1)
  })

  it('flush appends in order once the store recovers', async () => {
    const { state, log, capture } = setup(true)
    await capture.perform('roles.revoke', 'user:a', actor, {})
    await capture.perform('agents.disable', 'agent:x', actor, {})
    state.broken = false
    expect(await capture.flush()).toEqual({ flushed: 2, remaining: 0 })
    expect(log.events().map((e) => e.action)).toEqual(['roles.revoke', 'agents.disable'])
    expect(log.events().map((e) => e.seq)).toEqual([1, 2])
    expect(capture.outbox()).toHaveLength(0)
    expect(capture.counters().flushedCount).toBe(2)
  })

  it('concurrent flushes append each event once', async () => {
    const { state, log, capture } = setup(true)
    await capture.perform('roles.revoke', 'user:a', actor, {})
    state.broken = false
    await Promise.all([capture.flush(), capture.flush()])
    expect(log.events()).toHaveLength(1)
  })
})

describe('counters and errors', () => {
  it('tracks an outage drill: widening refused, tightening queued', async () => {
    const { capture } = setup(true)
    await capture.perform('settings.feature.enable', 'flag:a', actor, {})
    await capture.perform('settings.feature.disable', 'flag:a', actor, {})
    expect(capture.counters()).toEqual({
      committedCount: 0,
      refusedCount: 1,
      queuedCount: 1,
      flushedCount: 0,
    })
  })

  it('counters() returns a copy', async () => {
    const { capture } = setup()
    capture.counters().committedCount = 99
    expect(capture.counters().committedCount).toBe(0)
  })

  it('throws on an unknown action id and counts nothing', async () => {
    const { capture } = setup()
    await expect(capture.perform('nope.nothing', 's', actor, {})).rejects.toThrow(RangeError)
    expect(capture.counters()).toEqual({
      committedCount: 0,
      refusedCount: 0,
      queuedCount: 0,
      flushedCount: 0,
    })
  })

  it('accepts a plain boolean for brokenStore', async () => {
    const log = createLog({ formatVersion: FORMAT_VERSION })
    const capture = createCapture({ log, catalogue: CATALOGUE, brokenStore: true, now })
    expect((await capture.perform('roles.grant', 's', actor, {})).outcome).toBe('refused')
  })
})
