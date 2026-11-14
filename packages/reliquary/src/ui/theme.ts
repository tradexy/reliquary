/**
 * Design token layer for the Reliquary UI shell.
 *
 * A Theme is a pure data object. The shell injects it as CSS custom properties
 * on the root element once at mount — components never reference raw hex values
 * or hard-coded type strings. All visual decisions go through these tokens.
 *
 * Two presets are shipped:
 *   ossuary  — deep green and bone; for the Card Catalogue.
 *   foundry  — rust and soot; for the Parts Ledger.
 */

export interface Theme {
  /** Machine-readable identifier used as a data-theme attribute. */
  name: string
  colors: {
    /** Page background. */
    bg: string
    /** Card / panel surface. */
    surface: string
    /** Primary text. */
    ink: string
    /** Secondary / placeholder text. */
    muted: string
    /** Interactive accent (links, focus rings, badges). */
    accent: string
    /** Danger state — rejected rows, inconsistent badge. */
    danger: string
    /** Bone white — highlights, borders, dividers. */
    bone: string
  }
  type: {
    /** Heading typeface. */
    display: string
    /** Body copy typeface. */
    body: string
    /** Monospaced typeface — ids, counts, raw values. */
    mono: string
  }
  /** CSS border-radius token applied to cards and inputs. */
  radius: string
  /** Controls vertical rhythm. Compact suits data-dense views. */
  density: 'comfortable' | 'compact'
}

/**
 * Map a Theme to a flat object of CSS custom property declarations.
 * The shell calls this and applies each entry to `document.documentElement`.
 */
export function themeToProperties(theme: Theme): Record<string, string> {
  return {
    '--color-bg': theme.colors.bg,
    '--color-surface': theme.colors.surface,
    '--color-ink': theme.colors.ink,
    '--color-muted': theme.colors.muted,
    '--color-accent': theme.colors.accent,
    '--color-danger': theme.colors.danger,
    '--color-bone': theme.colors.bone,
    '--font-display': theme.type.display,
    '--font-body': theme.type.body,
    '--font-mono': theme.type.mono,
    '--radius': theme.radius,
    '--density': theme.density === 'compact' ? '0.75rem' : '1rem',
  }
}

// ── Presets ───────────────────────────────────────────────────────────────────

/**
 * Ossuary — the Card Catalogue preset.
 *
 * Deep forest green, amber candlelight, bone-white highlights.
 * The aesthetic of a well-kept archive: preserved, deliberate, faintly eerie.
 */
export const ossuary: Theme = {
  name: 'ossuary',
  colors: {
    bg: '#0d1a12',
    surface: '#152118',
    ink: '#e8dfc8',
    muted: '#8a9e8d',
    accent: '#7eb87e',
    danger: '#c0603a',
    bone: '#d4c9a8',
  },
  type: {
    display: '"Playfair Display", "Georgia", serif',
    body: '"EB Garamond", "Palatino Linotype", serif',
    mono: '"JetBrains Mono", "Courier New", monospace',
  },
  radius: '2px',
  density: 'comfortable',
}

/**
 * Foundry — the Parts Ledger preset.
 *
 * Rust orange on soot grey: the colour of iron oxide and dot-matrix ink.
 * Compact density suits a data-dense stock ledger.
 */
export const foundry: Theme = {
  name: 'foundry',
  colors: {
    bg: '#1a1410',
    surface: '#241c16',
    ink: '#e0d4c0',
    muted: '#8c7c68',
    accent: '#c87941',
    danger: '#b03a2e',
    bone: '#c8baa8',
  },
  type: {
    display: '"IBM Plex Serif", "Georgia", serif',
    body: '"IBM Plex Sans", "Helvetica Neue", sans-serif',
    mono: '"IBM Plex Mono", "Courier New", monospace',
  },
  radius: '0px',
  density: 'compact',
}
