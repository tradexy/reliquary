/**
 * Compliance control mappings.
 *
 * Each control is plain data: a statement and a predicate over one event. The
 * mapping says which recorded events are relevant to a control. It is evidence
 * for an assessor to review, not a claim of certification, and the statements
 * are paraphrases, not quotations of the standards.
 */

import type { AuditEvent } from '../chain/types.js';

export type StandardName = 'SOC 2' | 'ISO 27001' | 'EU AI Act';

export interface Control {
  standard: StandardName;
  control: string;
  statement: string;
  /** True when the event is evidence for this control. */
  query: (event: AuditEvent) => boolean;
}

export interface ControlResult {
  standard: StandardName;
  control: string;
  statement: string;
  /** Seqs of matching events, ascending. */
  eventSeqs: number[];
  /** Number of events examined. */
  considered: number;
  /** True when at least one event satisfies the control. */
  complete: boolean;
}

const acted = (e: AuditEvent): boolean => e.outcome !== 'refused';
const is = (...ids: string[]) => (e: AuditEvent): boolean => acted(e) && ids.includes(e.action);
const prefix = (...p: string[]) => (e: AuditEvent): boolean =>
  acted(e) && p.some((x) => e.action.startsWith(x));

export const CONTROLS: readonly Control[] = [
  // ── SOC 2 ────────────────────────────────────────────────────────────────
  {
    standard: 'SOC 2',
    control: 'CC6.1',
    statement: 'Access is granted to principals through recorded, attributable actions.',
    query: is('identity.user.invite', 'identity.user.reactivate', 'roles.grant'),
  },
  {
    standard: 'SOC 2',
    control: 'CC6.2',
    statement: 'Access is removed through recorded, attributable actions.',
    query: is('identity.user.suspend', 'roles.revoke'),
  },
  {
    standard: 'SOC 2',
    control: 'CC7.2',
    statement: 'Changes the audit store could not record were refused and the refusal was recorded.',
    query: (e) => e.outcome === 'refused',
  },
  {
    standard: 'SOC 2',
    control: 'CC8.1',
    statement: 'Changes to agents, connectors, features and policy are recorded.',
    query: is('agents.deploy', 'routing.connector.add', 'settings.feature.enable', 'governance.policy.update'),
  },

  // ── ISO 27001 ────────────────────────────────────────────────────────────
  {
    standard: 'ISO 27001',
    control: 'A.5.15',
    statement: 'Access control decisions on identities and roles are recorded.',
    query: prefix('identity.', 'roles.'),
  },
  {
    standard: 'ISO 27001',
    control: 'A.8.9',
    statement: 'Configuration changes to routing and settings are recorded.',
    query: prefix('routing.', 'settings.'),
  },
  {
    standard: 'ISO 27001',
    control: 'A.8.10',
    statement: 'Deletion of information is recorded as erasure or retention, with an authority.',
    query: (e) => e.lawful === 'erasure' || e.lawful === 'retention',
  },
  {
    standard: 'ISO 27001',
    control: 'A.8.15',
    statement: 'Privileged changes to guardrails and policy are logged.',
    query: is('agents.guardrail.ceiling.raise', 'agents.guardrail.ceiling.lower', 'governance.policy.update'),
  },

  // ── EU AI Act ────────────────────────────────────────────────────────────
  {
    standard: 'EU AI Act',
    control: 'Art. 12',
    statement: 'Events in the life of an AI agent are automatically recorded.',
    query: prefix('agents.'),
  },
  {
    standard: 'EU AI Act',
    control: 'Art. 14',
    statement: 'Humans can restrict or switch off an agent, and doing so is recorded.',
    query: is('agents.disable', 'agents.guardrail.ceiling.lower'),
  },
  {
    standard: 'EU AI Act',
    control: 'Art. 19',
    statement: 'Log retention actions are recorded with their authority.',
    query: (e) => e.lawful === 'retention',
  },
  {
    standard: 'EU AI Act',
    control: 'Art. 26',
    statement: 'Deployment of an agent into use is recorded.',
    query: is('agents.deploy'),
  },
];

/** Evaluate every control against a list of events. */
export function evaluateControls(
  events: readonly AuditEvent[],
  controls: readonly Control[] = CONTROLS,
): ControlResult[] {
  return controls.map((c) => {
    const eventSeqs = events.filter((e) => c.query(e)).map((e) => e.seq).sort((a, b) => a - b);
    return {
      standard: c.standard,
      control: c.control,
      statement: c.statement,
      eventSeqs,
      considered: events.length,
      complete: eventSeqs.length > 0,
    };
  });
}
