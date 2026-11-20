import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  AppShell,
  Badge,
  ControlPanel,
  FindingList,
  Intro,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  sealTheme,
  themeToProperties,
  witnessTheme,
} from './index.js'

describe('themes', () => {
  it('maps every token to a custom property', () => {
    const props = themeToProperties(sealTheme)
    expect(props['--color-accent']).toBe(sealTheme.colors.accent)
    expect(props['--font-mono']).toBe(sealTheme.type.mono)
    expect(props['--radius']).toBe(sealTheme.radius)
    expect(Object.keys(props)).toHaveLength(11)
  })

  it('uses system fonts only and distinct accents', () => {
    for (const t of [sealTheme, witnessTheme]) {
      expect(Object.values(t.type).join(' ')).not.toMatch(/https?:|url\(/)
    }
    expect(sealTheme.colors.accent).not.toBe(witnessTheme.colors.accent)
  })
})

describe('components', () => {
  it('labels simulated badges with text', () => {
    render(<Badge variant="simulated" />)
    expect(screen.getByText('simulated')).toBeInTheDocument()
  })

  it('shows state and simulated marker per control', () => {
    render(
      <ControlPanel
        controls={[
          { id: 'a', label: 'Anchoring', state: 'degraded', simulated: true },
          { id: 'b', label: 'Chain', state: 'failing' },
        ]}
      />,
    )
    expect(screen.getByText('degraded')).toBeInTheDocument()
    expect(screen.getByText('failing')).toBeInTheDocument()
    expect(screen.getByText('simulated')).toBeInTheDocument()
  })

  it('highlights the first divergence', () => {
    render(
      <FindingList
        firstDivergence={7}
        findings={[
          { seq: 7, code: 'HASH_MISMATCH', severity: 'error', message: 'm7' },
          { seq: 9, code: 'LINK_BROKEN', severity: 'error', message: 'm9' },
        ]}
      />,
    )
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveAttribute('data-first', 'true')
    expect(items[1]).not.toHaveAttribute('data-first')
  })

  it('selects a row with the keyboard', async () => {
    const onSelect = vi.fn()
    render(
      <Table caption="t">
        <THead>
          <Th>a</Th>
        </THead>
        <TBody>
          <Tr onSelect={onSelect}>
            <Td>x</Td>
          </Tr>
        </TBody>
      </Table>,
    )
    await userEvent.tab()
    await userEvent.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('renders the shell footer', () => {
    render(
      <AppShell theme={witnessTheme} title="T" footer={{ keyFingerprint: 'abc', events: 5, rejections: 2 }}>
        body
      </AppShell>,
    )
    expect(screen.getByRole('contentinfo')).toHaveTextContent('abc')
    expect(screen.getByRole('contentinfo')).toHaveTextContent('5')
    expect(screen.getByRole('main')).toHaveTextContent('body')
  })
})

describe('Intro story', () => {
  const base = {
    title: 'T',
    lede: 'L',
    steps: ['one', 'two', 'three'],
    example: 'E',
    illustration: <span>fig</span>,
    ctaLabel: 'Go',
    onCta: () => {},
  }

  it('renders the story above the steps when supplied', () => {
    render(<Intro {...base} story={{ title: 'A tale', paragraphs: ['First.', 'Second.'] }} />)
    expect(screen.getByText('THE STORY')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'A tale' })).toBeTruthy()
    expect(screen.getByText('Second.')).toBeTruthy()
    const story = screen.getByRole('region', { name: 'A tale' })
    const how = screen.getByRole('region', { name: 'How it works' })
    expect(story.compareDocumentPosition(how) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renders no story section when not supplied', () => {
    render(<Intro {...base} />)
    expect(screen.queryByText('THE STORY')).toBeNull()
    expect(screen.getByRole('region', { name: 'How it works' })).toBeTruthy()
  })
})
