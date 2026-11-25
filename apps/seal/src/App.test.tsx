import { beforeEach, describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App.js'
import { ORIGINAL } from './model.js'
import type { DemoBundle } from './model.js'

// A 40-event slice of the real bundle. Events 1..40 form a valid chain on their
// own, and with no seals or anchors nothing refers to events outside the slice.
// Rendering all 500 rows in jsdom made CI time out; verification itself is fast.
const FIXTURE_SIZE = 40
const fixture: DemoBundle = {
  ...ORIGINAL,
  events: ORIGINAL.events.slice(0, FIXTURE_SIZE),
  seals: [],
  anchors: [],
}

const EDIT_SEQ = 17
const DELETE_SEQ = 25
const INSERT_AFTER_SEQ = 30

const row = (container: HTMLElement, seq: number) =>
  container.querySelector<HTMLElement>(`tr[data-seq="${seq}"]`)

async function renderVerified() {
  const utils = render(<App bundle={fixture} />)
  await userEvent.click(screen.getByRole('tab', { name: 'Chain' }))
  // The initial verification seeds every control as ok.
  await screen.findByText('PASS', undefined, { timeout: 5000 })
  return utils
}

beforeEach(() => {
  window.location.hash = ''
})

describe('Seal start page', () => {
  it('is the default screen, listed first, and leads to the chain', async () => {
    render(<App bundle={fixture} />)
    expect(screen.getAllByRole('tab')[0]).toHaveTextContent('Start here')
    expect(screen.getByRole('tab', { name: 'Start here' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'What Seal does' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Open the chain' }))
    expect(screen.getByRole('tab', { name: 'Chain' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'Chain' })).toBeInTheDocument()
    await screen.findByText('PASS', undefined, { timeout: 5000 })
  })
})

describe('Seal app', () => {
  it('renders the chain and starts with every control ok', async () => {
    const { container } = await renderVerified()
    expect(container.querySelectorAll('tbody tr[data-seq]')).toHaveLength(FIXTURE_SIZE)
    const controls = screen.getByRole('list', { name: 'Controls' })
    const states = Array.from(controls.querySelectorAll('li')).map((li) => li.getAttribute('data-state'))
    expect(states).toEqual(['ok', 'ok', 'ok', 'ok', 'ok'])
    expect(within(controls).getAllByText('simulated').length).toBeGreaterThan(0)
  })

  it('filters by area and text', async () => {
    const { container } = await renderVerified()
    await userEvent.type(screen.getByLabelText(/Filter/), 'seq-that-does-not-exist-xyz')
    expect(container.querySelectorAll('tbody tr[data-seq]')).toHaveLength(0)
    expect(screen.getByText('No records match these filters.')).toBeInTheDocument()
  })

  it('shows the exact canonical preimage for a selected record', async () => {
    const { container } = await renderVerified()
    await userEvent.click(row(container, EDIT_SEQ)!)
    const pre = screen.getByTestId('preimage')
    expect(pre.textContent).toContain(`"seq":${EDIT_SEQ}`)
    expect(pre.textContent).toContain('"prevHash":"')
    expect(await screen.findByText('match')).toBeInTheDocument()
  })

  it('flags an edited record as HASH_MISMATCH at that seq, then restores', async () => {
    const { container } = await renderVerified()
    await userEvent.click(row(container, EDIT_SEQ)!)
    await userEvent.click(screen.getByRole('button', { name: 'Edit this record' }))

    const findings = await screen.findByRole('list', { name: 'Verification findings' }, { timeout: 5000 })
    await within(findings).findByText('HASH_MISMATCH')
    expect(findings.querySelector('[data-first="true"]')).toHaveTextContent(`seq ${EDIT_SEQ}`)
    expect(row(container, EDIT_SEQ)).toHaveAttribute('data-state', 'divergent')
    expect(await screen.findByRole('alert')).toHaveTextContent(String(EDIT_SEQ))

    // The frozen original is untouched.
    expect(fixture.events[EDIT_SEQ - 1]!.subject).not.toContain('(edited)')

    await userEvent.click(screen.getByRole('button', { name: 'Restore' }))
    await screen.findByText('PASS', undefined, { timeout: 5000 })
    expect(screen.queryByText('HASH_MISMATCH')).not.toBeInTheDocument()
    expect(row(container, EDIT_SEQ)).toHaveAttribute('data-state', 'ok')
  })

  it('detects a deleted record', async () => {
    const { container } = await renderVerified()
    await userEvent.click(row(container, DELETE_SEQ)!)
    await userEvent.click(screen.getByRole('button', { name: 'Delete this record' }))
    await within(await screen.findByRole('list', { name: 'Verification findings' }, { timeout: 5000 })).findAllByText(/^(SEQ_GAP|LINK_BROKEN)$/)
    expect(row(container, DELETE_SEQ + 1)).toHaveAttribute('data-state', 'divergent')
  })

  it('detects an inserted record', async () => {
    const { container } = await renderVerified()
    await userEvent.click(row(container, INSERT_AFTER_SEQ)!)
    await userEvent.click(screen.getByRole('button', { name: 'Insert a record' }))
    await within(await screen.findByRole('list', { name: 'Verification findings' }, { timeout: 5000 })).findByText('LINK_BROKEN')
  })

  it('catches a full-chain rewrite via external seals and anchors', async () => {
    const sealedFixture: DemoBundle = {
      ...ORIGINAL,
      events: ORIGINAL.events.slice(0, 60),
      seals: ORIGINAL.seals.filter((s) => s.seq <= 60),
      anchors: ORIGINAL.anchors.filter((a) => a.seq <= 60),
    }
    const { container } = render(<App bundle={sealedFixture} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Chain' }))
    await screen.findByText('PASS', undefined, { timeout: 5000 })
    await userEvent.click(row(container, 17)!)
    await userEvent.click(screen.getByRole('button', { name: 'Rewrite chain from here' }))

    const findings = await screen.findByRole('list', { name: 'Verification findings' }, { timeout: 5000 })
    await within(findings).findByText('SEAL_INVALID')
    expect(screen.getByTestId('chain-visualizer')).toHaveTextContent('Rewrite attack caught')
  })

  it('switches to the Kiro build audit bundle and verifies uploaded JSON offline', async () => {
    await renderVerified()
    await userEvent.click(screen.getByRole('button', { name: /Kiro Build Trail/ }))
    await screen.findByText('PASS', undefined, { timeout: 5000 })
    expect(screen.getByText('24 of 24 records')).toBeInTheDocument()

    const doctored = JSON.parse(JSON.stringify(ORIGINAL)) as DemoBundle
    doctored.events[10] = { ...doctored.events[10]!, subject: 'tampered-upload' }
    const file = new File([JSON.stringify(doctored)], 'doctored.json', { type: 'application/json' })
    const input = screen.getByLabelText('Verify JSON bundle file')
    await userEvent.upload(input, file)

    const findings = await screen.findByRole('list', { name: 'Verification findings' }, { timeout: 5000 })
    await within(findings).findByText('HASH_MISMATCH')
    expect(findings.querySelector('[data-first="true"]')).toHaveTextContent('seq 11')
  })

  it('supports deep-linking directly to a seq via hash', async () => {
    window.location.hash = '#chain?seq=17'
    render(<App bundle={fixture} />)
    await screen.findByText('PASS', undefined, { timeout: 5000 })
    expect(screen.getByTestId('preimage').textContent).toContain('"seq":17')
  })

  it('downloads the active bundle JSON and links to Witness Evidence', async () => {
    const create = vi.fn(() => 'blob:seal-test')
    const revoke = vi.fn()
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    try {
      await renderVerified()
      const witnessLink = screen.getByRole('link', { name: 'Witness → Evidence' })
      expect(witnessLink).toHaveAttribute('href', '../witness/#evidence')

      await userEvent.click(screen.getByRole('button', { name: 'Download .json' }))
      expect(create).toHaveBeenCalledTimes(1)
      expect(revoke).toHaveBeenCalledTimes(1)
      expect(revoke).toHaveBeenCalledWith('blob:seal-test')
    } finally {
      vi.restoreAllMocks()
    }
  })
})
