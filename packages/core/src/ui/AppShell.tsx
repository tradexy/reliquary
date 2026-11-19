import type { CSSProperties, ReactNode } from 'react';
import { SHELL_CSS } from './styles.js';
import { themeToProperties } from './theme.js';
import type { Theme } from './theme.js';

export interface AppShellFooter {
  keyFingerprint: string;
  events: number;
  rejections: number;
}

export interface AppShellProps {
  theme: Theme;
  title: string;
  subtitle?: string;
  /** Navigation slot, rendered inside a labelled <nav>. */
  nav?: ReactNode;
  footer: AppShellFooter;
  children: ReactNode;
}

export function AppShell({ theme, title, subtitle, nav, footer, children }: AppShellProps) {
  const style = themeToProperties(theme) as CSSProperties;
  return (
    <div className="ax-root" style={style} data-theme={theme.name}>
      <style>{SHELL_CSS}</style>
      <a className="ax-skip" href="#ax-main">
        Skip to content
      </a>
      <header className="ax-header" role="banner">
        <div className="ax-container">
          <h1>{title}</h1>
          {subtitle !== undefined ? <p className="ax-subtitle">{subtitle}</p> : null}
          {nav !== undefined ? (
            <nav className="ax-nav" aria-label="Primary">
              {nav}
            </nav>
          ) : null}
        </div>
      </header>
      <main id="ax-main" className="ax-main" tabIndex={-1}>
        <div className="ax-container">{children}</div>
      </main>
      <footer className="ax-footer" role="contentinfo">
        <div className="ax-container">
          <dl>
            <div>
              <dt>Key fingerprint</dt>
              <dd>{footer.keyFingerprint}</dd>
            </div>
            <div>
              <dt>Events</dt>
              <dd>{footer.events}</dd>
            </div>
            <div>
              <dt>Rejections</dt>
              <dd>{footer.rejections}</dd>
            </div>
          </dl>
        </div>
      </footer>
    </div>
  );
}
