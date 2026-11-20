/**
 * Shell stylesheet. All values come from the theme's custom properties.
 * Rendered once by AppShell as a <style> element (text content, not markup).
 */
export const SHELL_CSS = `
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; background: var(--color-bg); color: var(--color-ink);
  font-family: var(--font-body); -webkit-font-smoothing: antialiased; }
.ax-root { min-height: 100vh; display: flex; flex-direction: column;
  background: var(--color-bg); color: var(--color-ink); font-family: var(--font-body); line-height: 1.5; }
.ax-container { width: 100%; max-width: 1120px; margin: 0 auto; padding: 0 20px; }
.ax-header { border-bottom: 1px solid var(--color-muted); padding: 20px 0 12px; }
.ax-header h1 { margin: 0; font-family: var(--font-display); font-weight: 400; font-size: 28px; letter-spacing: 0.01em; }
.ax-subtitle { margin: 2px 0 0; color: var(--color-muted); font-size: 14px; }
.ax-nav { margin-top: 10px; }
.ax-main { flex: 1; padding: 20px 0 32px; }
.ax-footer { border-top: 1px solid var(--color-muted); padding: 12px 0; font-size: 13px; color: var(--color-muted); }
.ax-footer dl { display: flex; flex-wrap: wrap; gap: 4px 24px; margin: 0; }
.ax-footer dt { display: inline; }
.ax-footer dd { display: inline; margin: 0 0 0 6px; color: var(--color-ink); font-family: var(--font-mono); }
.ax-panel { background: var(--color-surface); border: 1px solid var(--color-muted);
  border-radius: var(--radius); padding: 14px 16px; margin-bottom: 16px; min-width: 0; }
.ax-panel > header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
.ax-panel h2 { margin: 0; font-family: var(--font-display); font-weight: 400; font-size: 18px; }
.ax-badge { display: inline-flex; align-items: center; gap: 4px; padding: 1px 8px; font-size: 12px;
  font-family: var(--font-mono); border: 1px solid currentColor; border-radius: var(--radius); white-space: nowrap; }
.ax-badge--ok { color: var(--color-accent); }
.ax-badge--warn { color: var(--color-bone); }
.ax-badge--fail { color: var(--color-danger); font-weight: 700; }
.ax-badge--simulated { color: var(--color-muted); border-style: dashed; }
.ax-stat { display: flex; flex-direction: column; }
.ax-stat-value { font-family: var(--font-mono); font-size: 24px; }
.ax-stat-label { font-size: 12px; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.06em; }
.ax-kv { display: grid; grid-template-columns: max-content 1fr; gap: 4px 14px; margin: 0; font-size: 14px; }
.ax-kv dt { color: var(--color-muted); }
.ax-kv dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
.ax-mono { font-family: var(--font-mono); }
.ax-table-wrap { overflow: auto; max-height: 460px; border: 1px solid var(--color-muted); border-radius: var(--radius); }
.ax-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ax-table caption { text-align: left; padding: 6px 8px; color: var(--color-muted); }
.ax-table th { position: sticky; top: 0; background: var(--color-surface); text-align: left; padding: 6px 8px;
  font-weight: 600; border-bottom: 1px solid var(--color-muted); white-space: nowrap; }
.ax-table td { padding: 5px 8px; border-bottom: 1px solid rgba(155,167,180,0.2); vertical-align: top; }
.ax-table tr[data-selectable="true"] { cursor: pointer; }
.ax-table tr[data-selectable="true"]:hover td { background: rgba(155,167,180,0.1); }
.ax-table tr[aria-current="true"] td { background: rgba(155,167,180,0.2); }
.ax-table tr[data-state="divergent"] td { box-shadow: inset 0 1px 0 var(--color-danger), inset 0 -1px 0 var(--color-danger); }
.ax-findings { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.ax-finding { border-left: 3px solid var(--color-muted); padding: 4px 10px; font-size: 13px; }
.ax-finding[data-severity="error"] { border-left-color: var(--color-danger); }
.ax-finding[data-severity="info"] { border-left-color: var(--color-accent); }
.ax-finding[data-first="true"] { background: rgba(236,138,126,0.15); outline: 1px solid var(--color-danger); }
.ax-finding-code { font-family: var(--font-mono); font-weight: 700; margin-right: 8px; }
.ax-empty { color: var(--color-muted); font-size: 14px; margin: 0; }
.ax-controls { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
.ax-control { border: 1px solid var(--color-muted); border-radius: var(--radius); padding: 8px 10px; background: var(--color-surface); min-width: 0; }
.ax-control-name { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-muted); }
.ax-control-detail { font-size: 12px; color: var(--color-muted); margin: 4px 0 0; }
.ax-btn { font: inherit; font-size: 13px; color: var(--color-ink); background: transparent; cursor: pointer;
  border: 1px solid var(--color-muted); border-radius: var(--radius); padding: 5px 12px; }
.ax-btn:hover { border-color: var(--color-ink); }
.ax-btn--primary { border-color: var(--color-accent); color: var(--color-accent); }
.ax-btn--danger { border-color: var(--color-danger); color: var(--color-danger); }
.ax-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ax-input { font: inherit; font-size: 13px; color: var(--color-ink); background: var(--color-bg);
  border: 1px solid var(--color-muted); border-radius: var(--radius); padding: 5px 8px; }
.ax-pre { margin: 0; padding: 10px; max-height: 220px; overflow: auto; background: var(--color-bg);
  border: 1px solid var(--color-muted); border-radius: var(--radius); font-family: var(--font-mono);
  font-size: 12px; white-space: pre-wrap; overflow-wrap: anywhere; }
.ax-grid { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 16px; align-items: start; }
.ax-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.ax-visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.ax-skip { position: absolute; left: -9999px; }
.ax-skip:focus { left: 8px; top: 8px; background: var(--color-surface); padding: 6px 10px; z-index: 10; }
:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
.ax-intro { max-width: 720px; }
.ax-intro-title { font-family: var(--font-display); font-weight: 400; font-size: 30px; margin: 0 0 8px; }
.ax-intro-lede { font-size: 18px; margin: 0 0 20px; }
.ax-intro h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-muted); margin: 24px 0 8px; }
.ax-intro p { margin: 0 0 12px; }
.ax-intro-steps { margin: 0; padding-left: 22px; display: grid; gap: 8px; }
.ax-intro-figure { margin: 24px 0 0; padding: 16px; background: var(--color-surface); border: 1px solid var(--color-muted); border-radius: var(--radius); }
.ax-intro-cta { font-size: 15px; padding: 8px 18px; margin-top: 12px; }
.ax-fig-row { display: flex; align-items: stretch; gap: 8px; flex-wrap: wrap; }
.ax-fig-block { flex: 1 1 120px; min-width: 0; border: 1px solid var(--color-muted); border-radius: var(--radius); padding: 8px 10px; background: var(--color-bg); }
.ax-fig-block[data-bad="true"] { border-color: var(--color-danger); }
.ax-fig-block strong { display: block; font-size: 13px; }
.ax-fig-block span { font-family: var(--font-mono); font-size: 12px; color: var(--color-muted); }
.ax-fig-arrow { align-self: center; font-family: var(--font-mono); color: var(--color-accent); white-space: nowrap; }
.ax-fig-arrow[data-bad="true"] { color: var(--color-danger); }
.ax-fig-caption { margin: 10px 0 0 !important; font-size: 13px; color: var(--color-muted); }
.ax-fig-cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.ax-fig-col { border: 1px solid var(--color-muted); border-radius: var(--radius); padding: 10px 12px; background: var(--color-bg); }
.ax-fig-col h4 { margin: 0 0 6px; font-size: 15px; }
.ax-fig-col ul { margin: 0; padding-left: 18px; font-size: 14px; }
@media (max-width: 860px) { .ax-grid { grid-template-columns: minmax(0, 1fr); }
  .ax-controls { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (prefers-reduced-motion: no-preference) {
  .ax-btn, .ax-table td { transition: background-color 150ms ease, border-color 150ms ease; } }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; scroll-behavior: auto !important; } }
`;
