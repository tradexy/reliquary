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
.ax-container { width: 100%; max-width: 1360px; margin: 0 auto; padding: 0 24px; }
.ax-header { border-top: 3px solid var(--color-accent); border-bottom: 1px solid rgba(155,167,180,0.22);
  background: linear-gradient(180deg, rgba(255,255,255,0.02), transparent); padding: 12px 0 14px; }
.ax-topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px solid rgba(155,167,180,0.14); }
.ax-brand { font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--color-ink); text-decoration: none; font-weight: 700; }
.ax-brand:hover { color: var(--color-accent); }
.ax-topbar-sep { color: rgba(155,167,180,0.4); font-size: 12px; }
.ax-switcher { display: flex; align-items: center; gap: 6px; }
.ax-switcher a { font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.04em; text-decoration: none;
  color: var(--color-muted); padding: 2px 9px; border-radius: var(--radius); border: 1px solid transparent; }
.ax-switcher a:hover { color: var(--color-ink); border-color: rgba(155,167,180,0.28); }
.ax-switcher a.is-active { color: var(--color-accent); border-color: var(--color-accent); background: rgba(155,167,180,0.08); }
.ax-header-main { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.ax-header h1 { margin: 0; font-family: var(--font-display); font-weight: 400; font-size: 30px; letter-spacing: 0.01em; line-height: 1.15; }
.ax-subtitle { margin: 4px 0 0; color: var(--color-muted); font-size: 14px; max-width: 68ch; }
.ax-nav { margin-top: 4px; }
.ax-main { flex: 1; padding: 20px 0 36px; }
.ax-footer { border-top: 1px solid rgba(155,167,180,0.22); padding: 14px 0; font-size: 13px; color: var(--color-muted); }
.ax-footer dl { display: flex; flex-wrap: wrap; gap: 6px 24px; margin: 0; }
.ax-footer dt { display: inline; }
.ax-footer dd { display: inline; margin: 0 0 0 6px; color: var(--color-ink); font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
.ax-panel { background: var(--color-surface); border: 1px solid rgba(155,167,180,0.24);
  border-radius: var(--radius); padding: 14px 16px; margin-bottom: 16px; min-width: 0;
  box-shadow: 0 1px 0 rgba(0,0,0,0.25); }
.ax-panel > header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
.ax-panel h2 { margin: 0; font-family: var(--font-display); font-weight: 400; font-size: 18px; }
.ax-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; font-size: 11px;
  font-family: var(--font-mono); border: 1px solid currentColor; border-radius: var(--radius); white-space: nowrap; }
.ax-badge--ok { color: var(--color-accent); }
.ax-badge--warn { color: var(--color-bone); }
.ax-badge--fail { color: var(--color-danger); font-weight: 700; }
.ax-badge--simulated { color: var(--color-muted); border-style: dashed; }
.ax-stat { display: flex; flex-direction: column; }
.ax-stat-value { font-family: var(--font-mono); font-size: 24px; font-variant-numeric: tabular-nums; line-height: 1.15; }
.ax-stat-label { font-size: 11px; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }
.ax-kv { display: grid; grid-template-columns: max-content 1fr; gap: 4px 14px; margin: 0; font-size: 13px; }
.ax-kv dt { color: var(--color-muted); }
.ax-kv dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
.ax-mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
.ax-nowrap { white-space: nowrap; }
.ax-truncate { max-width: 185px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ax-table-wrap { overflow: auto; max-height: 460px; border: 1px solid rgba(155,167,180,0.22); border-radius: var(--radius); background: var(--color-bg); }
.ax-tall-table .ax-table-wrap { max-height: 680px; }
.ax-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ax-table caption { text-align: left; padding: 6px 10px; color: var(--color-muted); }
.ax-table th { position: sticky; top: 0; z-index: 1; background: var(--color-surface); text-align: left; padding: 7px 8px;
  font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted);
  border-bottom: 1px solid rgba(155,167,180,0.26); white-space: nowrap; }
.ax-table td { padding: 5px 8px; border-bottom: 1px solid rgba(155,167,180,0.14); vertical-align: middle; font-variant-numeric: tabular-nums; }
.ax-table th:first-child, .ax-table td:first-child { position: sticky; left: 0; }
.ax-table th:first-child { z-index: 2; background: var(--color-surface); }
.ax-table td:first-child { z-index: 1; background: var(--color-bg); border-right: 1px solid rgba(155,167,180,0.18); }
.ax-table tr[aria-current="true"] td:first-child { background: var(--color-surface); }
.ax-table tr[data-selectable="true"] { cursor: pointer; }
.ax-table tr[data-selectable="true"]:hover td { background: rgba(155,167,180,0.08); }
.ax-table tr[aria-current="true"] td { background: rgba(142,180,218,0.14); }
.ax-table tr[data-state="divergent"] td { background: rgba(236,138,126,0.12);
  box-shadow: inset 0 1px 0 var(--color-danger), inset 0 -1px 0 var(--color-danger); }
.ax-findings { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.ax-finding { border-left: 3px solid var(--color-muted); padding: 6px 10px; font-size: 13px; background: rgba(0,0,0,0.14); border-radius: 0 var(--radius) var(--radius) 0; }
.ax-finding[data-severity="error"] { border-left-color: var(--color-danger); }
.ax-finding[data-severity="info"] { border-left-color: var(--color-accent); }
.ax-finding[data-first="true"] { background: rgba(236,138,126,0.16); outline: 1px solid var(--color-danger); }
.ax-finding-code { font-family: var(--font-mono); font-weight: 700; margin-right: 8px; }
.ax-empty { color: var(--color-muted); font-size: 13.5px; margin: 0; }
.ax-controls { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
.ax-control { border: 1px solid rgba(155,167,180,0.22); border-radius: var(--radius); padding: 9px 11px; background: var(--color-bg); min-width: 0; }
.ax-control[data-state="failing"] { border-color: var(--color-danger); background: rgba(236,138,126,0.07); }
.ax-control-name { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-muted); margin-bottom: 4px; }
.ax-control-detail { font-size: 12px; color: var(--color-muted); margin: 5px 0 0; }
.ax-btn { font: inherit; font-size: 13px; color: var(--color-ink); background: transparent; cursor: pointer;
  border: 1px solid rgba(155,167,180,0.34); border-radius: var(--radius); padding: 5px 12px; line-height: 1.35; }
.ax-btn:hover:not(:disabled) { border-color: var(--color-ink); background: rgba(255,255,255,0.04); }
.ax-btn--primary { border-color: var(--color-accent); color: var(--color-accent); background: rgba(155,167,180,0.06); }
.ax-btn--danger { border-color: var(--color-danger); color: var(--color-danger); }
.ax-btn:disabled { opacity: 0.58; cursor: not-allowed; }
input[type="checkbox"] { accent-color: var(--color-accent); }
.ax-input { font: inherit; font-size: 13px; color: var(--color-ink); background: var(--color-bg);
  border: 1px solid rgba(155,167,180,0.34); border-radius: var(--radius); padding: 5px 9px; }
.ax-pre { margin: 0; padding: 10px; max-width: 100%; max-height: 220px; overflow: auto; background: var(--color-bg);
  border: 1px solid rgba(155,167,180,0.22); border-radius: var(--radius); font-family: var(--font-mono);
  font-size: 12px; white-space: pre-wrap; word-break: break-word; overflow-wrap: anywhere; }
.ax-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 20px; align-items: start; }
.ax-grid > * { min-width: 0; }
.ax-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.ax-pills { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.ax-pill { font-family: var(--font-mono); font-size: 11.5px; color: var(--color-muted); background: var(--color-bg);
  border: 1px solid rgba(155,167,180,0.28); border-radius: 999px; padding: 3px 10px; cursor: pointer; text-decoration: none; }
.ax-pill:hover { color: var(--color-ink); border-color: var(--color-ink); }
.ax-pill.is-active { color: var(--color-accent); border-color: var(--color-accent); background: rgba(142,180,218,0.1); }
.ax-vis { background: var(--color-bg); border: 1px solid rgba(155,167,180,0.22); border-radius: var(--radius);
  padding: 12px; margin-bottom: 12px; overflow-x: auto; }
.ax-vis-note { margin: 8px 0 0; font-size: 12.5px; color: var(--color-muted); }
.ax-vis-note[data-bad="true"] { color: var(--color-danger); }
.ax-dropzone { border: 1px dashed rgba(155,167,180,0.38); border-radius: var(--radius); padding: 8px 12px;
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;
  background: rgba(0,0,0,0.14); margin-bottom: 14px; }
.ax-dropzone.is-drag { border-color: var(--color-accent); background: rgba(142,180,218,0.1); }
.ax-diff { border: 1px solid var(--color-danger); border-radius: var(--radius); padding: 8px 10px;
  background: rgba(236,138,126,0.08); margin-bottom: 10px; font-size: 12.5px; }
.ax-diff-old { color: var(--color-muted); text-decoration: line-through; }
.ax-diff-new { color: var(--color-danger); font-weight: 700; }
.ax-alert-banner { border: 1px solid rgba(155,167,180,0.28); border-radius: var(--radius); padding: 10px 12px;
  margin-bottom: 12px; background: rgba(0,0,0,0.18); display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.ax-alert-banner[data-outage="true"] { border-color: var(--color-danger); background: rgba(236,138,126,0.1); }
.ax-feed { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; max-height: 220px; overflow: auto; }
.ax-feed-item { border: 1px solid rgba(155,167,180,0.18); border-radius: var(--radius); padding: 7px 10px;
  background: var(--color-bg); display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12.5px; }
.ax-seq-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
.ax-seq-chip { font-family: var(--font-mono); font-size: 11.5px; padding: 2px 7px; border-radius: var(--radius);
  border: 1px solid rgba(155,167,180,0.3); color: var(--color-accent); text-decoration: none; background: var(--color-bg); }
.ax-seq-chip:hover { border-color: var(--color-accent); background: rgba(99,193,138,0.12); }
.ax-visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.ax-skip { position: absolute; left: -9999px; }
.ax-skip:focus { left: 8px; top: 8px; background: var(--color-surface); padding: 6px 10px; z-index: 10; }
:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
.ax-intro { max-width: 780px; margin: 0 auto; }
.ax-intro-title { font-family: var(--font-display); font-weight: 400; font-size: 32px; margin: 0 0 8px; }
.ax-intro-lede { font-size: 18px; margin: 0 0 20px; color: var(--color-bone); }
.ax-intro h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-muted); margin: 24px 0 8px; }
.ax-intro p { margin: 0 0 12px; }
.ax-intro-story-label { font-size: 12px; letter-spacing: 0.08em; color: var(--color-accent); margin: 24px 0 4px !important; }
.ax-intro .ax-intro-story-title { font-family: var(--font-display); font-weight: 400; font-size: 22px; text-transform: none; letter-spacing: 0; color: var(--color-ink); margin: 0 0 12px; }
.ax-intro-steps { margin: 0; padding-left: 22px; display: grid; gap: 8px; }
.ax-intro-figure { margin: 24px 0 0; padding: 16px; background: var(--color-surface); border: 1px solid rgba(155,167,180,0.24); border-radius: var(--radius); }
.ax-intro-cta { font-size: 15px; padding: 8px 18px; margin-top: 12px; }
.ax-fig-row { display: flex; align-items: stretch; gap: 8px; flex-wrap: wrap; }
.ax-fig-block { flex: 1 1 120px; min-width: 0; border: 1px solid rgba(155,167,180,0.28); border-radius: var(--radius); padding: 8px 10px; background: var(--color-bg); }
.ax-fig-block[data-bad="true"] { border-color: var(--color-danger); }
.ax-fig-block strong { display: block; font-size: 13px; }
.ax-fig-block span { font-family: var(--font-mono); font-size: 12px; color: var(--color-muted); }
.ax-fig-arrow { align-self: center; font-family: var(--font-mono); color: var(--color-accent); white-space: nowrap; }
.ax-fig-arrow[data-bad="true"] { color: var(--color-danger); }
.ax-fig-caption { margin: 10px 0 0 !important; font-size: 13px; color: var(--color-muted); }
.ax-fig-cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.ax-fig-col { border: 1px solid rgba(155,167,180,0.26); border-radius: var(--radius); padding: 10px 12px; background: var(--color-bg); }
.ax-fig-col h4 { margin: 0 0 6px; font-size: 15px; }
.ax-fig-col ul { margin: 0; padding-left: 18px; font-size: 14px; }
@media (max-width: 960px) { .ax-grid { grid-template-columns: minmax(0, 1fr); }
  .ax-controls { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .ax-container { padding: 0 14px; }
  .ax-controls { grid-template-columns: minmax(0, 1fr); }
  .ax-fig-cols { grid-template-columns: minmax(0, 1fr); } }
@media (prefers-reduced-motion: no-preference) {
  .ax-btn, .ax-table td, .ax-pill, .ax-switcher a { transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease; } }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; scroll-behavior: auto !important; } }
`;
