import type { IconName } from '../../../shared/icon.component';

/**
 * Shared visual vocabulary for process steps — the Fluent icon, brand-aligned
 * colour, and kind label for a node type. Used by the Compose palette + step
 * node so the authoring surface speaks one consistent language.
 */
const ICON_BY_TYPE: Record<string, IconName> = {
  'trigger.recordSubmitted': 'play',
  'trigger.schedule': 'clock',
  'gate.validate': 'split',
  'gate.allComplete': 'flag',
  'wait.pending': 'hourglass',
  'action.provision': 'flash',
  'action.notify': 'mail',
  'task.prepare': 'person',
  'monitor.sla': 'sync',
  'notify.confirm': 'flag',
  'notify.reject': 'dismiss',
};
const ICON_BY_PREFIX: Record<string, IconName> = {
  trigger: 'play', gate: 'split', wait: 'hourglass', action: 'flash',
  task: 'person', monitor: 'sync', notify: 'mail',
};
const COLOR_BY_PREFIX: Record<string, string> = {
  trigger: '#107c10', // green
  gate: '#bc4b09',    // amber
  wait: '#655f72',    // slate
  action: '#7500c0',  // brand purple
  task: '#5c0099',    // deep purple (agent family)
  monitor: '#c50f1f', // red
  notify: '#0f6cbd',  // blue
};
const LABEL_BY_PREFIX: Record<string, string> = {
  trigger: 'Trigger', gate: 'Gate', wait: 'Wait', action: 'Automated',
  task: 'Agent task', monitor: 'Monitor', notify: 'Notify',
};

export function stepIcon(type: string): IconName {
  return ICON_BY_TYPE[type] ?? ICON_BY_PREFIX[type.split('.')[0]] ?? 'circle';
}
export function stepColor(type: string): string {
  return COLOR_BY_PREFIX[type.split('.')[0]] ?? '#655f72';
}
export function stepKindLabel(type: string): string {
  return LABEL_BY_PREFIX[type.split('.')[0]] ?? 'Step';
}
