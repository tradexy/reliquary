import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App.js'
import { ORIGINAL } from './model.js'

const row = (container: HTMLElement, seq: number) =>
  container.querySelector<HTMLElement>(`tr[data-seq="${seq}"]`)

async function renderVerified() {
  const utils = render(<App />)
  // The initial verification seeds every control as ok.
  await screen.findByText('PASS', undefined, { timeout: 10000 })
  return utils
}

describe('Seal app', () => {
  it('renders the chain and starts with every control ok', async () => {
    const { container } = await renderVerified()
    expect(container.querySelectorAll('tbody tr[data-seq]').length).toBeGreaterThanOrEqual(500)
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
    await userEvent.click(row(container, 217)!)
    const pre = screen.getByTestId('preimage')
    expect(pre.textContent).toContain('"seq":217')
    expect(pre.textContent).toContain('"prevHash":"')
    expect(await screen.findByText('match')).toBeInTheDocument()
  })

  it('flags an edited record as HASH_MISMATCH at that seq, then restores', async () => {
    const { container } = await renderVerified()
    await userEvent.click(row(container, 217)!)
    await userEvent.click(screen.getByRole('button', { name: 'Edit this record' }))

    const findings = await screen.findByRole('list', { name: 'Verification findings' }, { timeout: 10000 })
    await within(findings).findByText('HASH_MISMATCH')
    expect(findings.querySelector('[data-first="true"]')).toHaveTextContent('seq 217')
    expect(row(container, 217)).toHaveAttribute('data-state', 'divergent')
    expect(await screen.findByRole('alert')).toHaveTextContent('217')

    // The frozen original is untouched.
    expect(ORIGINAL.events[216]!.subject).not.toContain('(edited)')

    await userEvent.click(screen.getByRole('button', { name: 'Restore' }))
    await screen.findByText('PASS', undefined, { timeout: 10000 })
    expect(screen.queryByText('HASH_MISMATCH')).not.toBeInTheDocument()
    expect(row(container, 217)).toHaveAttribute('data-state', 'ok')
  })

  it('detects a deleted record', async () => {
    const { container } = await renderVerified()
    await userEvent.click(row(container, 355)!)
    await userEvent.click(screen.getByRole('button', { name: 'Delete this record' }))
    await within(await screen.findByRole('list', { name: 'Verification findings' }, { timeout: 10000 })).findByText('SEQ_GAP')
    expect(row(container, 356)).toHaveAttribute('data-state', 'divergent')
  })

  it('detects an inserted record', async () => {
    const { container } = await renderVerified()
    await userEvent.click(row(container, 410)!)
    await userEvent.click(screen.getByRole('button', { name: 'Insert a record' }))
    await within(await screen.findByRole('list', { name: 'Verification findings' }, { timeout: 10000 })).findByText('LINK_BROKEN')
  })
})
