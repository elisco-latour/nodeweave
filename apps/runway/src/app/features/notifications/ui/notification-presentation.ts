import type { EventType } from '../../../domain/model';
import type { IconName } from '../../../shared/icon.component';
import type { Tone } from '../../../shared/state-chip.component';

/** Presentation mappings for notifications — icon/tone per event type, kept out of the domain. */
export const EVENT_ICON: Record<EventType, IconName> = {
  'case.created': 'cases', 'intake.rejected': 'error-circle',
  'validation.passed': 'check-circle', 'validation.failed': 'warning',
  'item.started': 'sync', 'item.prepared': 'sync', 'item.completed': 'check-circle', 'item.blocked': 'error-circle',
  'reminder.sent': 'mail', 'escalation.raised': 'alert-urgent', 'exception.raised': 'warning',
  'action.approved': 'check', 'action.rejected': 'dismiss',
  'state.changed': 'flash', 'case.completed': 'flag', 'case.cancelled': 'minus-circle',
};

export const EVENT_TONE: Record<EventType, Tone> = {
  'case.created': 'info', 'intake.rejected': 'danger',
  'validation.passed': 'ok', 'validation.failed': 'warn',
  'item.started': 'info', 'item.prepared': 'info', 'item.completed': 'ok', 'item.blocked': 'danger',
  'reminder.sent': 'info', 'escalation.raised': 'warn', 'exception.raised': 'warn',
  'action.approved': 'ok', 'action.rejected': 'idle',
  'state.changed': 'info', 'case.completed': 'ok', 'case.cancelled': 'idle',
};

export function notifAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3.6e6);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
