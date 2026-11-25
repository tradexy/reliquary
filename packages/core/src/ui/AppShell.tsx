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
  /** Which app is active in the top switcher bar. */
  activeApp?: 'seal' | 'witness';
  /** Optional right-aligned live status badge in the top bar. */
  status?: ReactNode;
  /** Navigation slot, rendered inside a labelled <nav>. */
  nav?: ReactNode;
  footer: AppShellFooter;
  children: ReactNode;
}

export function AppShell({ theme, title, subtitle, activeApp, status, nav, footer, children }: AppShellProps) {
  const style = themeToProperties(theme) as CSSProperties;
  return (
    <div className="ax-root" style={style} data-theme={theme.name}>
      <style>{SHELL_CSS}</style>
      <a className="ax-skip" href="#ax-main">
        Skip to content
      </a>
      <header className="ax-header" role="banner">
        <div className="ax-container">
          <div className="ax-topbar">
            <div className="ax-row" style={{ gap: 14 }}>
              <a className="ax-brand" href="../">
                Anchora
              </a>
              <span className="ax-topbar-sep" aria-hidden="true">/</span>
              <nav className="ax-switcher" aria-label="Applications">
                <a
                  href="../seal/#chain?seq=217"
                  className={activeApp === 'seal' ? 'is-active' : undefined}
                  aria-current={activeApp === 'seal' ? 'page' : undefined}
                >
                  Seal
                </a>
                <a
                  href="../witness/#drill"
                  className={activeApp === 'witness' ? 'is-active' : undefined}
                  aria-current={activeApp === 'witness' ? 'page' : undefined}
                >
                  Witness
                </a>
              </nav>
            </div>
            {status !== undefined ? <div className="ax-row">{status}</div> : null}
          </div>
          <div className="ax-header-main">
            <div>
              <h1>{title}</h1>
              {subtitle !== undefined ? <p className="ax-subtitle">{subtitle}</p> : null}
            </div>
            {nav !== undefined ? (
              <nav className="ax-nav" aria-label="Primary">
                {nav}
              </nav>
            ) : null}
          </div>
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
