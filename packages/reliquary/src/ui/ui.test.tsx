/**
 * Component tests for the Reliquary UI shell.
 *
 * Covers:
 *   - Search: filtering, result count, empty state, all-records passthrough.
 *   - Report: lossless state, inconsistent badge + alert, rejected rows.
 *   - Record: sections, provenance disclosure.
 *   - App: routing between screens via URL location prop.
 */

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Search } from './Search.js'
import { Report } from './Report.js'
import { Record } from './Record.js'
import { App } from './App.js'
import { createRepository } from '../repository/memory.js'
import { buildReport } from '../import/report.js'
import type { ResurrectionReport } from '../contract/types.js'
import type { RecordSection } from './types.js'
import { ossuary } from './theme.js'

// ── Shared fixtures ───────────────────────────────────────────────────────────

interface Widget {
  id: string
  name: string
  category: string
}

const WIDGETS: Widget[] = [
  { id: 'W-001', name: 'Copper Gear', category: 'Mechanical' },
  { id: 'W-002', name: 'Bone Clasp', category: 'Fastener' },
  { id: 'W-003', name: 'Amber Lens', category: 'Optical' },
]

const LOSSLESS_REPORT = buildReport({
  sourceName: 'widget-store',
  importedAt: '2024-10-31T00:00:00.000Z',
  rowsIn: 3,
  rowsOut: 3,
  rejected: [],
  fieldMappings: [
    { sourceField: 'ID', normalisedField: 'id' },
    { sourceField: 'NAME', normalisedField: 'name' },
  ],
  unmappedFields: ['LEGACY_CODE'],
  synthesisedFields: ['slug'],
})

const INCONSISTENT_REPORT: ResurrectionReport = {
  sourceName: 'widget-store',
  importedAt: '2024-10-31T00:00:00.000Z',
  rowsIn: 5,          // deliberately wrong — only 3 rows accounted for
  rowsOut: 2,
  rejected: [{ kind: 'rejected', sourceRef: 'row-9', reason: 'Missing required field: id' }],
  fieldMappings: [],
  unmappedFields: [],
  synthesisedFields: [],
  status: 'inconsistent',
}

function makeRepo(report = LOSSLESS_REPORT) {
  return createRepository<Widget>(WIDGETS, report, 'id', ['name', 'category'])
}

function makeAppConfig() {
  return {
    title: 'Widget Archive',
    subtitle: 'Historical widget records',
    searchFields: ['name', 'category'] as Array<keyof Widget & string>,
    renderRecord: (w: Widget): RecordSection[] => [
      { heading: 'Identity', fields: [{ label: 'Name', value: w.name }, { label: 'Category', value: w.category }] },
    ],
    renderSummary: (w: Widget) => ({ primary: w.name, secondary: w.category }),
    theme: ossuary,
  }
}

// ── Search component ──────────────────────────────────────────────────────────

describe('Search', () => {
  function renderSearch(query = '', onQueryChange = vi.fn()) {
    const repo = makeRepo()
    return render(
      <Search
        repository={repo}
        query={query}
        onQueryChange={onQueryChange}
        renderSummary={(record) => ({ primary: record.name, secondary: record.category })}
        getId={(w) => w.id}
        report={LOSSLESS_REPORT}
      />,
    )
  }

  it('shows all records when query is empty', () => {
    renderSearch('')
    // All three widgets appear as links
    expect(screen.getByText('Copper Gear')).toBeInTheDocument()
    expect(screen.getByText('Bone Clasp')).toBeInTheDocument()
    expect(screen.getByText('Amber Lens')).toBeInTheDocument()
  })

  it('displays total count for empty query', () => {
    renderSearch('')
    expect(screen.getByText('3 records')).toBeInTheDocument()
  })

  it('filters results by name (case-insensitive)', () => {
    renderSearch('copper')
    expect(screen.getByText('Copper Gear')).toBeInTheDocument()
    expect(screen.queryByText('Bone Clasp')).not.toBeInTheDocument()
    expect(screen.queryByText('Amber Lens')).not.toBeInTheDocument()
  })

  it('filters results by category', () => {
    renderSearch('mechanical')
    expect(screen.getByText('Copper Gear')).toBeInTheDocument()
    expect(screen.queryByText('Bone Clasp')).not.toBeInTheDocument()
  })

  it('shows filtered count vs total', () => {
    renderSearch('mechanical')
    expect(screen.getByText('1 of 3 records')).toBeInTheDocument()
  })

  it('shows empty state when no records match', () => {
    renderSearch('xyzzy')
    expect(screen.getByRole('status')).toHaveTextContent('No records match "xyzzy"')
  })

  it('calls onQueryChange when input changes', () => {
    const handler = vi.fn()
    renderSearch('', handler)
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'bone' } })
    expect(handler).toHaveBeenCalledWith('bone')
  })

  it('renders result links pointing to ?id=', () => {
    renderSearch('')
    const link = screen.getByText('Copper Gear').closest('a')
    expect(link?.getAttribute('href')).toBe('?id=W-001')
  })
})

// ── Search summary rendering ──────────────────────────────────────────────────

describe('Search — summary layout', () => {
  it('renders primary text as the row title', () => {
    const repo = makeRepo()
    render(
      <Search
        repository={repo}
        query=""
        onQueryChange={vi.fn()}
        renderSummary={(w) => ({ primary: w.name, secondary: w.category })}
        getId={(w) => w.id}
        report={LOSSLESS_REPORT}
      />,
    )
    expect(screen.getByText('Copper Gear')).toBeInTheDocument()
  })

  it('renders secondary text beneath primary', () => {
    const repo = makeRepo()
    render(
      <Search
        repository={repo}
        query=""
        onQueryChange={vi.fn()}
        renderSummary={(w) => ({ primary: w.name, secondary: w.category })}
        getId={(w) => w.id}
        report={LOSSLESS_REPORT}
      />,
    )
    // All three category values should appear as secondary lines
    expect(screen.getByText('Mechanical')).toBeInTheDocument()
    expect(screen.getByText('Fastener')).toBeInTheDocument()
    expect(screen.getByText('Optical')).toBeInTheDocument()
  })

  it('renders meta text when provided', () => {
    const repo = makeRepo()
    render(
      <Search
        repository={repo}
        query=""
        onQueryChange={vi.fn()}
        renderSummary={(w) => ({ primary: w.name, meta: w.id })}
        getId={(w) => w.id}
        report={LOSSLESS_REPORT}
      />,
    )
    // id doubles as meta here — should appear in the row
    expect(screen.getByText('W-001')).toBeInTheDocument()
  })

  it('omits secondary element when not provided', () => {
    const repo = makeRepo()
    const { container } = render(
      <Search
        repository={repo}
        query="copper"
        onQueryChange={vi.fn()}
        renderSummary={(w) => ({ primary: w.name })}
        getId={(w) => w.id}
        report={LOSSLESS_REPORT}
      />,
    )
    // Only the primary div inside the first result — no sibling secondary div
    const primaryEl = screen.getByText('Copper Gear')
    expect(primaryEl.parentElement?.children.length).toBe(1)
  })
})

// ── Report component ──────────────────────────────────────────────────────────

describe('Report — lossless', () => {
  it('shows the LOSSLESS badge', () => {
    render(<Report report={LOSSLESS_REPORT} />)
    // The badge renders with status text
    expect(screen.getByText('LOSSLESS')).toBeInTheDocument()
  })

  it('badge uses status role (not alert) when lossless', () => {
    render(<Report report={LOSSLESS_REPORT} />)
    const badge = screen.getByRole('status', { name: /report status: lossless/i })
    expect(badge).toBeInTheDocument()
  })

  it('shows correct row counts', () => {
    render(<Report report={LOSSLESS_REPORT} />)
    // 3 stat panels: "3", "3", "0"
    expect(screen.getByText('Rows in')).toBeInTheDocument()
    expect(screen.getByText('Rows out')).toBeInTheDocument()
    expect(screen.getByText('Rejected')).toBeInTheDocument()
  })

  it('shows field mapping table', () => {
    render(<Report report={LOSSLESS_REPORT} />)
    expect(screen.getByText('ID')).toBeInTheDocument()
    expect(screen.getByText('id')).toBeInTheDocument()
  })

  it('shows unmapped field tag', () => {
    render(<Report report={LOSSLESS_REPORT} />)
    expect(screen.getByText('LEGACY_CODE')).toBeInTheDocument()
  })

  it('shows synthesised field tag', () => {
    render(<Report report={LOSSLESS_REPORT} />)
    expect(screen.getByText('slug')).toBeInTheDocument()
  })

  it('shows "None" message when no rows rejected', () => {
    render(<Report report={LOSSLESS_REPORT} />)
    expect(screen.getByText(/none — every row was accepted/i)).toBeInTheDocument()
  })
})

describe('Report — inconsistent', () => {
  it('shows INCONSISTENT badge', () => {
    render(<Report report={INCONSISTENT_REPORT} />)
    expect(screen.getByText('INCONSISTENT')).toBeInTheDocument()
  })

  it('badge uses alert role when inconsistent', () => {
    render(<Report report={INCONSISTENT_REPORT} />)
    // The badge itself has role="alert"
    const badge = screen.getByRole('alert', { name: /report status: inconsistent/i })
    expect(badge).toBeInTheDocument()
  })

  it('renders an alert with reconciliation failure message', () => {
    render(<Report report={INCONSISTENT_REPORT} />)
    // There are two alerts: the badge and the warning block; get all of them
    const alerts = screen.getAllByRole('alert')
    // At least one of them contains the failure explanation
    const hasMessage = alerts.some((el) =>
      el.textContent?.toLowerCase().includes('reconciliation failed'),
    )
    expect(hasMessage).toBe(true)
  })

  it('displays the row count delta in the warning', () => {
    render(<Report report={INCONSISTENT_REPORT} />)
    // rowsIn=5, rowsOut=2, rejected=1 → delta = 5 - (2+1) = +2
    const warning = screen.getByRole('alert', { name: '' })
    // Find the warning block (the one that contains "delta")
    const alerts = screen.getAllByRole('alert')
    const warningBlock = alerts.find((el) => el.textContent?.includes('delta'))
    expect(warningBlock?.textContent).toMatch(/delta.*\+2/i)
  })

  it('shows the rejected row with sourceRef and reason', () => {
    render(<Report report={INCONSISTENT_REPORT} />)
    expect(screen.getByText('row-9')).toBeInTheDocument()
    expect(screen.getByText('Missing required field: id')).toBeInTheDocument()
  })
})

// ── Record component ──────────────────────────────────────────────────────────

describe('Record', () => {
  const sections: RecordSection[] = [
    {
      heading: 'Identity',
      fields: [
        { label: 'Name', value: 'Copper Gear' },
        { label: 'Category', value: 'Mechanical' },
      ],
    },
  ]

  it('renders section heading and field values', () => {
    render(<Record sections={sections} report={LOSSLESS_REPORT} returnQuery="" />)
    expect(screen.getByText('Identity')).toBeInTheDocument()
    expect(screen.getByText('Copper Gear')).toBeInTheDocument()
    expect(screen.getByText('Mechanical')).toBeInTheDocument()
  })

  it('renders null field values as "not recorded"', () => {
    const withNull: RecordSection[] = [
      { heading: 'Details', fields: [{ label: 'Notes', value: null }] },
    ]
    render(<Record sections={withNull} report={LOSSLESS_REPORT} returnQuery="" />)
    expect(screen.getByText('not recorded')).toBeInTheDocument()
  })

  it('includes provenance disclosure summary', () => {
    render(<Record sections={sections} report={LOSSLESS_REPORT} returnQuery="" />)
    expect(screen.getByText(/provenance — imported from widget-store/i)).toBeInTheDocument()
  })

  it('provenance disclosure is in the DOM (collapsed by default)', () => {
    render(<Record sections={sections} report={LOSSLESS_REPORT} returnQuery="" />)
    const details = document.querySelector('details')
    expect(details).not.toBeNull()
    // Closed by default
    expect(details?.open).toBe(false)
  })

  it('back link returns to search when returnQuery is set', () => {
    render(<Record sections={sections} report={LOSSLESS_REPORT} returnQuery="copper" />)
    const link = screen.getByRole('link', { name: /back to search results/i })
    expect(link.getAttribute('href')).toBe('?q=copper')
  })

  it('back link returns to the same document when no returnQuery', () => {
    render(<Record sections={sections} report={LOSSLESS_REPORT} returnQuery="" />)
    const link = screen.getByRole('link', { name: /back to search results/i })
    expect(link.getAttribute('href')).toBe('?')
  })
})

// ── App routing ───────────────────────────────────────────────────────────────

describe('App routing', () => {
  const config = makeAppConfig()
  const repo = makeRepo()

  it('renders Search screen at /', () => {
    render(
      <App
        config={config}
        repository={repo}
        getId={(w) => w.id}
        location={{ pathname: '/', search: '' }}
      />,
    )
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })

  it('renders Search with query from ?q=', () => {
    render(
      <App
        config={config}
        repository={repo}
        getId={(w) => w.id}
        location={{ pathname: '/', search: '?q=copper' }}
      />,
    )
    expect(screen.getByRole('searchbox')).toHaveValue('copper')
    expect(screen.getByText('Copper Gear')).toBeInTheDocument()
    expect(screen.queryByText('Bone Clasp')).not.toBeInTheDocument()
  })

  it('renders Record screen at /?id=', () => {
    render(
      <App
        config={config}
        repository={repo}
        getId={(w) => w.id}
        location={{ pathname: '/', search: '?id=W-001' }}
      />,
    )
    expect(screen.getByText('Copper Gear')).toBeInTheDocument()
    expect(screen.getByText(/provenance/i)).toBeInTheDocument()
  })

  it('renders not-found when id is unknown', () => {
    render(
      <App
        config={config}
        repository={repo}
        getId={(w) => w.id}
        location={{ pathname: '/', search: '?id=MISSING' }}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/MISSING.*not found/i)
  })

  it('renders Report screen at /report', () => {
    render(
      <App
        config={config}
        repository={repo}
        getId={(w) => w.id}
        location={{ pathname: '/report', search: '' }}
      />,
    )
    expect(screen.getByText('Resurrection Report')).toBeInTheDocument()
    expect(screen.getByText('LOSSLESS')).toBeInTheDocument()
  })

  it('renders inconsistent report badge on /report when data is inconsistent', () => {
    const inconsistentRepo = makeRepo(INCONSISTENT_REPORT)
    render(
      <App
        config={config}
        repository={inconsistentRepo}
        getId={(w) => w.id}
        location={{ pathname: '/report', search: '' }}
      />,
    )
    expect(screen.getByText('INCONSISTENT')).toBeInTheDocument()
    // The warning alert should be present
    const alerts = screen.getAllByRole('alert')
    const hasFailureText = alerts.some((el) =>
      el.textContent?.toLowerCase().includes('reconciliation failed'),
    )
    expect(hasFailureText).toBe(true)
  })

  it('header contains a link to the report view', () => {
    render(
      <App
        config={config}
        repository={repo}
        getId={(w) => w.id}
        location={{ pathname: '/', search: '' }}
      />,
    )
    const reportLink = screen.getByRole('link', { name: /view resurrection report/i })
    expect(reportLink.getAttribute('href')).toBe('?view=report')
  })
})

// ── Report — publish gate panel ───────────────────────────────────────────────

import { simulateLossyImport } from '../import/simulate.js'
import { fireEvent as fe } from '@testing-library/react'

describe('Report — publish gate panel (verified state)', () => {
  it('renders the "Simulate a lossy adapter" button', () => {
    render(<Report report={LOSSLESS_REPORT} />)
    expect(screen.getByRole('button', { name: /simulate a lossy adapter/i })).toBeInTheDocument()
  })

  it('Export CSV button is enabled for the verified report', () => {
    render(<Report report={LOSSLESS_REPORT} />)
    const exportBtn = screen.getByRole('button', { name: /download resurrection report as csv/i })
    expect(exportBtn).not.toBeDisabled()
  })

  it('does not show INCONSISTENT badge before simulation', () => {
    render(<Report report={LOSSLESS_REPORT} />)
    // Should show LOSSLESS, not INCONSISTENT in the main badge
    const badge = screen.getByRole('status', { name: /report status: lossless/i })
    expect(badge).toBeInTheDocument()
  })
})

describe('Report — publish gate panel (simulated state)', () => {
  function renderAndSimulate() {
    const { getByRole } = render(<Report report={LOSSLESS_REPORT} />)
    fe.click(getByRole('button', { name: /simulate a lossy adapter/i }))
    return { getByRole }
  }

  it('badge shows INCONSISTENT with role=alert after simulation', () => {
    renderAndSimulate()
    const badge = screen.getByRole('alert', { name: /report status: inconsistent/i })
    expect(badge).toBeInTheDocument()
    expect(badge.textContent).toMatch(/INCONSISTENT/)
  })

  it('count panel shows the reduced rowsOut', () => {
    renderAndSimulate()
    // LOSSLESS_REPORT has rowsOut=3; simulated is 2
    // Count figures: "3" (rowsIn), "2" (rowsOut), "0" (rejected)
    // Find the Rows out figure: its sibling label is "Rows out"
    const rowsOutLabel = screen.getByText('Rows out')
    const figure = rowsOutLabel.nextElementSibling
    expect(figure?.textContent).toBe('2')
  })

  it('displays the delta and InconsistentReportError message', () => {
    renderAndSimulate()
    // Should mention InconsistentReportError
    const panel = screen.getByText(/InconsistentReportError/i)
    expect(panel).toBeInTheDocument()
    // Delta is 1 (rowsIn=3, rowsOut=2, rejected=0 → delta=1)
    expect(panel.closest('[aria-labelledby="publish-gate-heading"]')?.textContent).toMatch(
      /reduced by 1/i,
    )
  })

  it('Export CSV button is disabled in simulated state', () => {
    renderAndSimulate()
    const exportBtn = screen.getByRole('button', { name: /download resurrection report as csv/i })
    expect(exportBtn).toBeDisabled()
  })

  it('"Restore verified report" button returns to the real data', () => {
    renderAndSimulate()
    fe.click(screen.getByRole('button', { name: /restore verified report/i }))
    // Badge should return to LOSSLESS
    expect(screen.getByRole('status', { name: /report status: lossless/i })).toBeInTheDocument()
    // Export CSV re-enabled
    expect(
      screen.getByRole('button', { name: /download resurrection report as csv/i }),
    ).not.toBeDisabled()
  })
})

// ── Search — report status strip ─────────────────────────────────────────────

describe('Search — report status strip', () => {
  function renderSearchWithReport(report: ResurrectionReport) {
    const repo = makeRepo(report)
    return render(
      <Search
        repository={repo}
        query=""
        onQueryChange={vi.fn()}
        renderSummary={(w) => ({ primary: w.name })}
        getId={(w) => w.id}
        report={report}
      />,
    )
  }

  it('renders counts in the status strip', () => {
    renderSearchWithReport(LOSSLESS_REPORT)
    // rowsIn=3, rowsOut=3, rejected=0
    expect(screen.getByText(/3 in · 3 out · 0 rejected/i)).toBeInTheDocument()
  })

  it('shows lossless pill when report is lossless', () => {
    renderSearchWithReport(LOSSLESS_REPORT)
    expect(screen.getByText('LOSSLESS')).toBeInTheDocument()
  })

  it('shows inconsistent pill when report is inconsistent', () => {
    renderSearchWithReport(INCONSISTENT_REPORT)
    expect(screen.getByText('INCONSISTENT')).toBeInTheDocument()
  })

  it('renders a "View report" link pointing to ?view=report', () => {
    renderSearchWithReport(LOSSLESS_REPORT)
    const link = screen.getByRole('link', { name: /view report/i })
    expect(link).toBeInTheDocument()
    expect(link.getAttribute('href')).toBe('?view=report')
  })
})
