import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CATALOGUE } from '@anchora/core/capture'
import { App } from './App.js'

const tab = (name: string) => screen.getByRole('tab', { name })
const counter = (name: string) => within(screen.getByTestId(`counter-${name}`)).getByText(/^\d+$/).textContent

beforeEach(() => {
  window.location.hash = ''
})

describe('Witness start page', () => {
  it('is the default screen, listed first, and leads to the coverage matrix', async () => {
    render(<App />)
    expect(screen.getAllByRole('tab')[0]).toHaveTextContent('Start here')
    expect(tab('Start here')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { name: 'What Witness does' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(3)
    await userEvent.click(screen.getByRole('button', { name: 'See the coverage matrix' }))
    expect(tab('Coverage')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('total-actions')).toBeInTheDocument()
  })
})

describe('Witness app', () => {
  it('renders every catalogued action and reports zero gaps', async () => {
    const { container } = render(<App />)
    await userEvent.click(tab('Coverage'))
    for (const entry of CATALOGUE) {
      expect(container.querySelector(`tr[data-action="${entry.id}"]`)).not.toBeNull()
    }
    expect(within(screen.getByTestId('gap-count')).getByText('0')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(within(screen.getByTestId('total-actions')).getByText(String(CATALOGUE.length))).toBeInTheDocument()
    expect(screen.getAllByText('stops').length).toBeGreaterThan(0)
    expect(screen.getAllByText('queues').length).toBeGreaterThan(0)
  })

  it('refuses Grant and queues Revoke while the store is down', async () => {
    render(<App />)
    await userEvent.click(tab('Drill'))
    await userEvent.click(screen.getByRole('switch', { name: 'Audit store available' }))

    await userEvent.click(screen.getByRole('button', { name: 'Grant a role' }))
    expect(screen.getByTestId('outcome')).toHaveTextContent('refused (audit-unavailable)')
    expect(counter('refused')).toBe('1')
    expect(counter('applied')).toBe('0')

    await userEvent.click(screen.getByRole('button', { name: 'Revoke a role' }))
    expect(screen.getByTestId('outcome')).toHaveTextContent('queued')
    expect(counter('queued')).toBe('1')
    expect(counter('applied')).toBe('1')
    expect(counter('outbox')).toBe('1')
  })

  it('appends the queued event after the store is restored and flushed', async () => {
    render(<App />)
    await userEvent.click(tab('Drill'))
    const toggle = screen.getByRole('switch', { name: 'Audit store available' })
    await userEvent.click(toggle)
    await userEvent.click(screen.getByRole('button', { name: 'Revoke a role' }))
    await userEvent.click(toggle)
    await userEvent.click(screen.getByRole('button', { name: 'Flush outbox' }))
    expect(await screen.findByTestId('flush-note')).toHaveTextContent('Flushed 1 queued event')
    expect(counter('outbox')).toBe('0')
    expect(screen.getByTestId('last-seq')).toHaveTextContent('Appended seq 501')
  })

  it('shows a committed grant with its seq when the store is up', async () => {
    render(<App />)
    await userEvent.click(tab('Drill'))
    await userEvent.click(screen.getByRole('button', { name: 'Grant a role' }))
    expect(await screen.findByText(/roles\.grant: committed/)).toBeInTheDocument()
    expect(screen.getByTestId('last-seq')).toHaveTextContent('Appended seq 501')
  })

  it('lists the three lawful changes with their authorities', async () => {
    const { container } = render(<App />)
    await userEvent.click(tab('Lawful changes'))
    const expected: [number, string, string][] = [
      [144, 'erasure', 'dpo@northgate.example'],
      [288, 'retention', 'policy:retention-90d'],
      [401, 'payload-stripped', 'ravi.menon'],
    ]
    expect(container.querySelectorAll('tr[data-seq]')).toHaveLength(3)
    for (const [seq, kind, authority] of expected) {
      const row = container.querySelector<HTMLElement>(`tr[data-seq="${seq}"]`)!
      expect(within(row).getByText(kind)).toBeInTheDocument()
      expect(within(row).getByText(authority)).toBeInTheDocument()
    }
    expect(screen.getByText(/reports as lawful rather than tampering/)).toBeInTheDocument()
  })

  it('shows a control with events as complete', async () => {
    render(<App />)
    await userEvent.click(tab('Evidence'))
    const group = screen.getByRole('region', { name: 'SOC 2' })
    await userEvent.click(within(group).getAllByRole('button')[0]!)
    const detail = screen.getByTestId('control-detail')
    expect(within(detail).getByText('complete')).toBeInTheDocument()
    expect(Number(screen.getByTestId('event-count').textContent)).toBeGreaterThan(0)
  })

  it('exports an evidence bundle and verifies it in memory', async () => {
    const create = vi.fn(() => 'blob:test')
    const revoke = vi.fn()
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<App />)
    await userEvent.click(tab('Evidence'))
    await userEvent.click(screen.getByRole('button', { name: 'Export evidence bundle' }))
    expect(create).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: 'Verify this export' }))
    const result = await screen.findByTestId('verify-result', undefined, { timeout: 20000 })
    expect(within(result).getByText('PASS')).toBeInTheDocument()
    expect(within(result).getByText('500')).toBeInTheDocument()
  }, 30000)
})
