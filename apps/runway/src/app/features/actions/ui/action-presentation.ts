import type { ActionKind } from '../../../domain/model';
import type { IconName } from '../../../shared/icon.component';
import type { Tone } from '../../../shared/state-chip.component';
import type { ActionStatus } from '../domain/action.entity';
import type { InboxSort } from '../state/inbox.view-model';

/** Presentation mappings for actions — icon/tone/label, kept out of the domain. */
export const KIND_TONE: Record<ActionKind, Tone> = { approval: 'accent', decision: 'warn', 'human-task': 'info', triage: 'danger' };
export const KIND_LABEL: Record<ActionKind, string> = { approval: 'Approval', decision: 'Decision', 'human-task': 'Human task', triage: 'Triage' };
export const KIND_CTA: Record<ActionKind, string> = { approval: 'Approve', decision: 'Confirm', 'human-task': 'Mark done', triage: 'Resolve' };
export const KIND_ICON: Record<ActionKind, IconName> = { approval: 'check-circle', decision: 'split', 'human-task': 'person', triage: 'alert-urgent' };
export const STATUS_LABEL: Record<ActionStatus, string> = { open: 'Open', resolved: 'Resolved', dismissed: 'Dismissed' };

export const INBOX_SORTS: { id: InboxSort; label: string }[] = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'kind', label: 'Type' },
  { id: 'case', label: 'Case' },
];
export const KIND_FILTERS: { id: 'all' | ActionKind; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'triage', label: 'Triage' },
  { id: 'decision', label: 'Decision' },
  { id: 'approval', label: 'Approval' },
  { id: 'human-task', label: 'Human' },
];

export function actionAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 3.6e6);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
