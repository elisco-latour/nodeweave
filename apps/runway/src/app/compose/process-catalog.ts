import { Edge, type SchemaField, type VisualCanvasService } from '@nodeweave/angular';
import { NodeCatalog, type NodeTypeDefinition, type PortSpec } from '@nodeweave/angular-authoring';
import type { Pathway } from '../domain/model';
import { StepNodeComponent } from './step-node.component';

// ── SchemaField shorthands ───────────────────────────────────────────────────
const str = (label: string, extra: Partial<SchemaField> = {}): SchemaField => ({ type: 'string', label, ...extra });
const num = (label: string, extra: Partial<SchemaField> = {}): SchemaField => ({ type: 'number', label, ...extra });
const sel = (label: string, options: string[]): SchemaField => ({ type: 'select', label, options });
const area = (label: string): SchemaField => ({ type: 'textarea', label, rows: 3 });

const CHIP: Record<string, { color: string; icon: string }> = {
  trigger: { color: '#16a34a', icon: '▶' },
  gate: { color: '#d97706', icon: '◇' },
  wait: { color: '#64748b', icon: '⏳' },
  action: { color: '#4f46e5', icon: '⚙' },
  task: { color: '#7c3aed', icon: '☑' },
  monitor: { color: '#e11d48', icon: '⟳' },
  notify: { color: '#0284c7', icon: '✉' },
};

function step(
  type: string, category: string, label: string, hint: string,
  fields: Record<string, SchemaField>, defaults: Record<string, unknown>,
  ports: Array<'in' | 'out' | PortSpec> = ['in', 'out'],
): NodeTypeDefinition {
  const chip = CHIP[type.split('.')[0]] ?? { color: '#64748b', icon: '▪' };
  return {
    type, label, hint, icon: chip.icon, color: chip.color, category,
    width: 212, height: 78, ports, resizable: false,
    configSchema: { fields: { title: str('Title'), ...fields } },
    defaults: { title: label, ...defaults },
    component: StepNodeComponent,
  };
}

const definitions: NodeTypeDefinition[] = [
  // Triggers
  step('trigger.recordSubmitted', 'Triggers', 'Record submitted', 'The single structured entry',
    { source: sel('Source', ['Intake form', 'Project intake API', 'Controlled feed']), list: str('List / endpoint') },
    { source: 'Intake form', list: 'Hires & Leavers' }, ['out']),
  step('trigger.schedule', 'Triggers', 'Daily check', 'Recurring monitoring sweep',
    { cron: str('Cron') }, { cron: '0 9 * * *' }, ['out']),

  // Gates & waits
  step('gate.validate', 'Gates & waits', 'Validate & complete', 'Branches on the outcome',
    { mandatoryFields: area('Mandatory fields'), resumeOn: str('Resume on') },
    { mandatoryFields: 'EID, start date, role, location, pathway', resumeOn: 'missing info provided' },
    ['in', { id: 'valid', direction: 'out', label: 'valid' }, { id: 'missing', direction: 'out', label: 'missing' }, { id: 'invalid', direction: 'out', label: 'invalid' }]),
  step('wait.pending', 'Gates & waits', 'Wait for information', 'Suspend until data arrives',
    { resumeOn: str('Resume on'), escalateTo: str('Escalate to') },
    { resumeOn: 'required field provided', escalateTo: '{{config.requester}}' }),
  step('gate.allComplete', 'Gates & waits', 'All ready?', 'Completion join',
    { condition: str('Condition') }, { condition: 'all readiness outcomes confirmed' }),

  // Actions
  step('action.provision', 'Actions', 'Provision', 'Access / equipment / workspace',
    { target: str('Target'), via: sel('Via', ['auto (Graph)', 'auto (API)', 'human']), owner: str('Owner') },
    { target: '{{item}}', via: 'auto (Graph)', owner: '{{config.owner}}' }),
  step('action.notify', 'Actions', 'Notify', 'Email / Teams message',
    { channel: sel('Channel', ['email', 'teams']), to: str('To'), template: str('Template') },
    { channel: 'teams', to: '{{owner}}', template: 'generic' }),

  // Agent tasks
  step('task.prepare', 'Agent tasks', 'Prepare human task', 'Agent prepares · human executes',
    { system: str('System'), owner: str('Owner'), note: str('Note') },
    { system: 'CDP', owner: '{{config.owner}}', note: '' }),

  // Monitoring & completion
  step('monitor.sla', 'Monitoring & completion', 'Monitor & escalate', 'Reminders & escalation',
    { remindAfterH: num('Remind after (h)'), escalateAfterH: num('Escalate after (h)'), escalateTo: str('Escalate to') },
    { remindAfterH: 24, escalateAfterH: 48, escalateTo: '{{config.escalation}}' }),
  step('notify.confirm', 'Monitoring & completion', 'Completion', 'Closes the loop on confirmed outcomes',
    { to: str('To'), subject: str('Subject') },
    { to: '{{joiner}}, {{leads}}', subject: 'Ready for Day 1 — {{joiner}}' }, ['in']),
];

export const processCatalog = new NodeCatalog(definitions);

// ── Seed templates per pathway ───────────────────────────────────────────────
interface Seed { type: string; id: string; x: number; y: number; overrides?: Record<string, unknown>; }

function fanoutFor(pathway: Pathway): Seed[] {
  return pathway === 'centre-level'
    ? [
        { type: 'action.provision', id: 'equip', x: 900, y: 20, overrides: { title: 'Equipment' } },
        { type: 'action.provision', id: 'access', x: 900, y: 118, overrides: { title: 'Access & licences' } },
        { type: 'task.prepare', id: 'workspace', x: 900, y: 216, overrides: { title: 'Workspace', system: 'Facilities' } },
        { type: 'action.notify', id: 'orientation', x: 900, y: 314, overrides: { title: 'Orientation invite' } },
      ]
    : [
        { type: 'action.provision', id: 'access', x: 900, y: 20, overrides: { title: 'Directory & mailing lists' } },
        { type: 'task.prepare', id: 'cdp', x: 900, y: 118, overrides: { title: 'CDP RORO', system: 'CDP' } },
        { type: 'action.provision', id: 'teams', x: 900, y: 216, overrides: { title: 'Teams membership' } },
        { type: 'task.prepare', id: 'myte', x: 900, y: 314, overrides: { title: 'MyTE WBS', system: 'MyTE' } },
      ];
}

export function buildTemplate(service: VisualCanvasService, pathway: Pathway): void {
  service.clear();
  const gateTitle = pathway === 'project-level' ? 'Validate EID' : 'Validate & complete';

  const base: Seed[] = [
    { type: 'trigger.recordSubmitted', id: 'onSubmit', x: 40, y: 150 },
    { type: 'gate.validate', id: 'validate', x: 320, y: 150, overrides: { title: gateTitle } },
    { type: 'notify.reject', id: 'reject', x: 320, y: 340, overrides: {} },
    { type: 'wait.pending', id: 'wait', x: 320, y: 470 },
    { type: 'gate.allComplete', id: 'allDone', x: 1200, y: 170 },
    { type: 'notify.confirm', id: 'confirm', x: 1460, y: 170 },
    { type: 'trigger.schedule', id: 'onSchedule', x: 40, y: 470 },
    { type: 'monitor.sla', id: 'monitor', x: 320, y: 600 },
  ];
  const fanout = fanoutFor(pathway);

  // `notify.reject` isn't a distinct catalog type; use action.notify styled as a reject.
  const add = (s: Seed) => {
    const type = s.type === 'notify.reject' ? 'action.notify' : s.type;
    const overrides = s.type === 'notify.reject' ? { title: 'Reject & notify', channel: 'email', to: '{{lead}}' } : s.overrides ?? {};
    service.addNode(processCatalog.createNode(type, s.x, s.y, overrides, s.id));
  };
  [...base, ...fanout].forEach(add);

  let e = 0;
  const link = (from: string, to: string, src = 'out') =>
    service.addEdge(new Edge({ id: `e${++e}`, sourcePortId: `${from}:${src}`, targetPortId: `${to}:in`, type: 'smoothstep', markerEnd: 'arrowclosed' }));

  link('onSubmit', 'validate');
  link('validate', fanout[0].id, 'valid');
  for (const f of fanout.slice(1)) link('validate', f.id, 'valid');
  link('validate', 'wait', 'missing');
  link('validate', 'reject', 'invalid');
  link('wait', fanout[0].id);
  for (const f of fanout) link(f.id, 'allDone');
  link('allDone', 'confirm');
  link('onSchedule', 'monitor');
}
