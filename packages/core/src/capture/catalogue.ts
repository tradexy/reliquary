/**
 * Action catalogue for the Anchora capture layer.
 *
 * Every auditable action must appear here before it can be appended to the chain.
 * append.ts rejects any event whose `action` field is not in this catalogue.
 *
 * fail-closed  — the audit append must succeed before the change is applied.
 *                Used for widening actions: grant, invite, enable, raise ceiling.
 * queue        — the change is applied first; the event is pushed to the durable
 *                outbox and flushed when the store recovers.
 *                Used for tightening actions: revoke, suspend, disable, lower.
 *
 * Requirements: 1.4, 10.1
 */

export type FailMode = 'fail-closed' | 'queue';

export interface CatalogueEntry {
  /** Stable dot-separated identifier, e.g. "identity.user.invite" */
  id: string;
  /** Broad area: identity | roles | agents | routing | settings | governance */
  area: 'identity' | 'roles' | 'agents' | 'routing' | 'settings' | 'governance';
  /**
   * fail-closed for widening actions; queue for tightening actions.
   * Widening: grant, invite, connector change, feature-flag enable, guardrail ceiling raise.
   * Tightening: revoke, suspend, disable, guardrail ceiling lower.
   */
  failMode: FailMode;
  /** Human-readable description for the UI and evidence reports. */
  description: string;
  /**
   * Reference to the test that proves this action is covered.
   * A build guard verifies this ref resolves to an actual test.
   */
  testRef: string;
}

export const CATALOGUE: readonly CatalogueEntry[] = [
  // ── Identity ──────────────────────────────────────────────────────────────
  {
    id: 'identity.user.invite',
    area: 'identity',
    failMode: 'fail-closed',
    description: 'A user is invited to the system (widening: adds a principal).',
    testRef: 'capture/catalogue.test.ts#identity.user.invite',
  },
  {
    id: 'identity.user.suspend',
    area: 'identity',
    failMode: 'queue',
    description: 'A user account is suspended (tightening: removes access).',
    testRef: 'capture/catalogue.test.ts#identity.user.suspend',
  },
  {
    id: 'identity.user.reactivate',
    area: 'identity',
    failMode: 'fail-closed',
    description: 'A suspended user account is reactivated (widening: restores access).',
    testRef: 'capture/catalogue.test.ts#identity.user.reactivate',
  },

  // ── Roles ─────────────────────────────────────────────────────────────────
  {
    id: 'roles.grant',
    area: 'roles',
    failMode: 'fail-closed',
    description: 'A role is granted to a principal (widening: increases privilege).',
    testRef: 'capture/catalogue.test.ts#roles.grant',
  },
  {
    id: 'roles.revoke',
    area: 'roles',
    failMode: 'queue',
    description: 'A role is revoked from a principal (tightening: reduces privilege).',
    testRef: 'capture/catalogue.test.ts#roles.revoke',
  },

  // ── Agents ────────────────────────────────────────────────────────────────
  {
    id: 'agents.deploy',
    area: 'agents',
    failMode: 'fail-closed',
    description: 'An agent is deployed or promoted to production (widening: new capability).',
    testRef: 'capture/catalogue.test.ts#agents.deploy',
  },
  {
    id: 'agents.disable',
    area: 'agents',
    failMode: 'queue',
    description: 'An agent is disabled or retired (tightening: removes capability).',
    testRef: 'capture/catalogue.test.ts#agents.disable',
  },
  {
    id: 'agents.guardrail.ceiling.raise',
    area: 'agents',
    failMode: 'fail-closed',
    description: 'An agent guardrail ceiling (token limit, rate limit, scope) is raised (widening).',
    testRef: 'capture/catalogue.test.ts#agents.guardrail.ceiling.raise',
  },
  {
    id: 'agents.guardrail.ceiling.lower',
    area: 'agents',
    failMode: 'queue',
    description: 'An agent guardrail ceiling is lowered (tightening).',
    testRef: 'capture/catalogue.test.ts#agents.guardrail.ceiling.lower',
  },

  // ── Routing ───────────────────────────────────────────────────────────────
  {
    id: 'routing.connector.add',
    area: 'routing',
    failMode: 'fail-closed',
    description: 'A connector or integration endpoint is added (widening: new data path).',
    testRef: 'capture/catalogue.test.ts#routing.connector.add',
  },
  {
    id: 'routing.connector.remove',
    area: 'routing',
    failMode: 'queue',
    description: 'A connector or integration endpoint is removed (tightening: closes data path).',
    testRef: 'capture/catalogue.test.ts#routing.connector.remove',
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  {
    id: 'settings.feature.enable',
    area: 'settings',
    failMode: 'fail-closed',
    description: 'A feature flag is enabled (widening: exposes new functionality).',
    testRef: 'capture/catalogue.test.ts#settings.feature.enable',
  },
  {
    id: 'settings.feature.disable',
    area: 'settings',
    failMode: 'queue',
    description: 'A feature flag is disabled (tightening: hides functionality).',
    testRef: 'capture/catalogue.test.ts#settings.feature.disable',
  },

  // ── Governance ────────────────────────────────────────────────────────────
  {
    id: 'governance.policy.update',
    area: 'governance',
    failMode: 'fail-closed',
    description: 'A governance policy is created or updated (widening: changes permitted behaviour).',
    testRef: 'capture/catalogue.test.ts#governance.policy.update',
  },
] as const;

/**
 * Map of action id → entry for O(1) lookup in append.ts.
 */
export const CATALOGUE_MAP: ReadonlyMap<string, CatalogueEntry> = new Map(
  CATALOGUE.map((e) => [e.id, e]),
);

/**
 * Returns the catalogue entry for `actionId`, or throws if the action is not
 * registered. append.ts calls this to enforce that only known actions enter
 * the chain.
 */
export function requireCatalogueEntry(actionId: string): CatalogueEntry {
  const entry = CATALOGUE_MAP.get(actionId);
  if (entry === undefined) {
    throw new RangeError(
      `Unregistered action "${actionId}". Add it to capture/catalogue.ts before appending.`,
    );
  }
  return entry;
}
