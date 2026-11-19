/**
 * The exact string an event's hash is computed over.
 *
 * One function, used by append(), verifyChain() and the UI's record view, so the
 * bytes a sceptic is shown are the bytes that were hashed. The `hash` field is
 * excluded; everything else is included.
 */

import { canonical } from '../crypto/canonical.js';
import type { AuditEvent } from './types.js';

export function eventPreimage(event: Omit<AuditEvent, 'hash'>): string {
  return canonical({
    seq: event.seq,
    at: event.at,
    actor: event.actor,
    action: event.action,
    subject: event.subject,
    outcome: event.outcome,
    lawful: event.lawful,
    detail: event.detail,
    prevHash: event.prevHash,
  });
}
