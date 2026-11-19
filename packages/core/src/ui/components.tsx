import { useId } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import type { Finding } from '../chain/types.js';

// ── Panel ───────────────────────────────────────────────────────────────────

export interface PanelProps {
  title: string;
  /** Optional right-aligned content in the header (badges, buttons). */
  actions?: ReactNode;
  children?: ReactNode;
}

export function Panel({ title, actions, children }: PanelProps) {
  const id = useId();
  return (
    <section className="ax-panel" aria-labelledby={id}>
      <header>
        <h2 id={id}>{title}</h2>
        {actions !== undefined ? <div className="ax-row">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

// ── Badge ───────────────────────────────────────────────────────────────────

export type BadgeVariant = 'ok' | 'warn' | 'fail' | 'simulated';

const BADGE_GLYPH: Record<BadgeVariant, string> = { ok: '✓', warn: '!', fail: '✗', simulated: '◌' };

/** Meaning is carried by the glyph and the text, never by colour alone. */
export function Badge({ variant, children }: { variant: BadgeVariant; children?: ReactNode }) {
  return (
    <span className={`ax-badge ax-badge--${variant}`} data-variant={variant}>
      <span aria-hidden="true">{BADGE_GLYPH[variant]}</span>
      {children ?? variant}
    </span>
  );
}

// ── Stat ────────────────────────────────────────────────────────────────────

export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="ax-stat">
      <span className="ax-stat-value">{value}</span>
      <span className="ax-stat-label">{label}</span>
    </div>
  );
}

// ── KeyValue ────────────────────────────────────────────────────────────────

export interface KeyValueItem {
  label: string;
  value: ReactNode;
  mono?: boolean;
}

export function KeyValue({ items }: { items: readonly KeyValueItem[] }) {
  return (
    <dl className="ax-kv">
      {items.map((item) => (
        <div key={item.label} style={{ display: 'contents' }}>
          <dt>{item.label}</dt>
          <dd className={item.mono === true ? 'ax-mono' : undefined}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// ── Table primitives ────────────────────────────────────────────────────────

export interface TableProps {
  /** Accessible name; shown as a visible caption unless hideCaption is set. */
  caption: string;
  hideCaption?: boolean;
  children: ReactNode;
}

export function Table({ caption, hideCaption, children }: TableProps) {
  return (
    <div className="ax-table-wrap">
      <table className="ax-table">
        <caption className={hideCaption === true ? 'ax-visually-hidden' : undefined}>{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr>{children}</tr>
    </thead>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function Th({ children }: { children?: ReactNode }) {
  return <th scope="col">{children}</th>;
}

export function Td({ children, mono }: { children?: ReactNode; mono?: boolean }) {
  return <td className={mono === true ? 'ax-mono' : undefined}>{children}</td>;
}

export interface TrProps {
  children: ReactNode;
  /** Makes the row keyboard-operable: Tab to focus, Enter or Space to select. */
  onSelect?: () => void;
  selected?: boolean;
  /** Extra data-* attributes, e.g. { 'data-seq': '217' }. */
  data?: Record<`data-${string}`, string>;
}

export function Tr({ children, onSelect, selected, data }: TrProps) {
  const onKeyDown = (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (onSelect === undefined) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };
  return (
    <tr
      {...data}
      data-selectable={onSelect !== undefined ? 'true' : undefined}
      tabIndex={onSelect !== undefined ? 0 : undefined}
      aria-current={selected === true ? 'true' : undefined}
      onClick={onSelect}
      onKeyDown={onKeyDown}
    >
      {children}
    </tr>
  );
}

// ── FindingList ─────────────────────────────────────────────────────────────

export interface FindingListProps {
  findings: readonly Finding[];
  /** Highlighted as the first point at which the chain diverges. */
  firstDivergence?: number | null;
  onSelectSeq?: (seq: number) => void;
}

export function FindingList({ findings, firstDivergence = null, onSelectSeq }: FindingListProps) {
  if (findings.length === 0) {
    return <p className="ax-empty">No findings.</p>;
  }
  // Mark only the first error finding at the divergence seq.
  const firstIndex = findings.findIndex((f) => f.severity === 'error' && f.seq === firstDivergence);
  return (
    <ul className="ax-findings" aria-label="Verification findings">
      {findings.map((f, i) => (
        <li
          key={`${f.code}-${f.seq}-${i}`}
          className="ax-finding"
          data-severity={f.severity}
          data-first={i === firstIndex ? 'true' : undefined}
        >
          <span className="ax-finding-code">{f.code}</span>
          {onSelectSeq !== undefined && f.seq > 0 ? (
            <button type="button" className="ax-btn" onClick={() => onSelectSeq(f.seq)}>
              seq {f.seq}
            </button>
          ) : (
            <span className="ax-mono">seq {f.seq}</span>
          )}
          {i === firstIndex ? <strong> first divergence</strong> : null}
          <div>{f.message}</div>
        </li>
      ))}
    </ul>
  );
}

// ── ControlPanel ────────────────────────────────────────────────────────────

export type ControlState = 'ok' | 'degraded' | 'failing';

export interface ControlStatus {
  id: string;
  label: string;
  state: ControlState;
  detail?: string;
  /** Shows a `simulated` badge: the control is modelled, not real. */
  simulated?: boolean;
}

const STATE_VARIANT: Record<ControlState, BadgeVariant> = { ok: 'ok', degraded: 'warn', failing: 'fail' };

export function ControlPanel({ controls }: { controls: readonly ControlStatus[] }) {
  return (
    <ul className="ax-controls" aria-label="Controls">
      {controls.map((c) => (
        <li key={c.id} className="ax-control" data-control={c.id} data-state={c.state}>
          <div className="ax-control-name">{c.label}</div>
          <div className="ax-row">
            <Badge variant={STATE_VARIANT[c.state]}>{c.state}</Badge>
            {c.simulated === true ? <Badge variant="simulated">simulated</Badge> : null}
          </div>
          {c.detail !== undefined ? <p className="ax-control-detail">{c.detail}</p> : null}
        </li>
      ))}
    </ul>
  );
}
