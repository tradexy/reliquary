/**
 * Design tokens. Components read colours, type and radius only through CSS custom
 * properties, so an app changes its look by passing a different Theme.
 *
 * Fonts are system stacks (Requirement 15): nothing is fetched at runtime.
 */

export interface Theme {
  name: string;
  colors: {
    bg: string;
    surface: string;
    ink: string;
    muted: string;
    accent: string;
    danger: string;
    bone: string;
  };
  type: {
    display: string;
    body: string;
    mono: string;
  };
  radius: string;
}

export type ThemeProperties = Record<`--${string}`, string>;

export function themeToProperties(theme: Theme): ThemeProperties {
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
  };
}

const SANS =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const SERIF = 'Georgia, "Iowan Old Style", "Palatino Linotype", Palatino, "Times New Roman", serif';
const MONO =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", "Courier New", monospace';

/** Seal: cool slate and bone. An institutional vault. */
export const sealTheme: Theme = {
  name: 'seal',
  colors: {
    bg: '#161c24',
    surface: '#202833',
    ink: '#e8e4d9',
    muted: '#9ba7b4',
    accent: '#8eb4da',
    danger: '#ec8a7e',
    bone: '#e8e4d9',
  },
  type: { display: SERIF, body: SANS, mono: MONO },
  radius: '4px',
};

/** Witness: ink and ledger-green. A registry. */
export const witnessTheme: Theme = {
  name: 'witness',
  colors: {
    bg: '#0f1311',
    surface: '#171d19',
    ink: '#e6ebe4',
    muted: '#9aa89c',
    accent: '#63c18a',
    danger: '#ec8a7e',
    bone: '#d8d1bd',
  },
  type: { display: SERIF, body: SANS, mono: MONO },
  radius: '2px',
};
