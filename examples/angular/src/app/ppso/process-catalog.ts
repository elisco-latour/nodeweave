import { Edge } from '@build744/nodeweave-angular';
import type { SchemaField, VisualCanvasService } from '@build744/nodeweave-angular';
import { NodeCatalog, type NodeTypeDefinition, type PortSpec } from '@build744/nodeweave-angular-authoring';
import { StepNodeComponent } from './step-node.component';

// ── Schema field shorthands ──────────────────────────────────────────────────
const str = (label: string, extra: Partial<SchemaField> = {}): SchemaField => ({ type: 'string', label, ...extra });
const num = (label: string, extra: Partial<SchemaField> = {}): SchemaField => ({ type: 'number', label, ...extra });
const bool = (label: string): SchemaField => ({ type: 'boolean', label });
const sel = (label: string, options: string[]): SchemaField => ({ type: 'select', label, options });
const area = (label: string, extra: Partial<SchemaField> = {}): SchemaField => ({ type: 'textarea', label, rows: 3, ...extra });

const CHIP: Record<string, { color: string; icon: string }> = {
  trigger: { color: '#16a34a', icon: '▶' },
  gate: { color: '#d97706', icon: '◈' },
  wait: { color: '#64748b', icon: '⏳' },
  action: { color: '#4f46e5', icon: '⚙' },
  task: { color: '#7c3aed', icon: '☑' },
  monitor: { color: '#e11d48', icon: '⟳' },
  notify: { color: '#0284c7', icon: '✉' },
};

/** Build a NodeTypeDefinition, filling chrome from the type's category prefix. */
function step(
  type: string,
  category: string,
  label: string,
  hint: string,
  fields: Record<string, SchemaField>,
  defaults: Record<string, unknown>,
  ports: Array<'in' | 'out' | PortSpec> = ['in', 'out'],
): NodeTypeDefinition {
  const chip = CHIP[type.split('.')[0]] ?? { color: '#64748b', icon: '▪' };
  return {
    type,
    label,
    hint,
    icon: chip.icon,
    color: chip.color,
    category,
    width: 224,
    height: 88,
    ports,
    resizable: false,
    configSchema: { fields: { title: str('Title'), ...fields } },
    defaults: { title: label, ...defaults },
    component: StepNodeComponent,
  };
}

// ── The onboarding process vocabulary ────────────────────────────────────────
const definitions: NodeTypeDefinition[] = [
  // Triggers
  step('trigger.recordSubmitted', 'Triggers', 'Record submitted',
    'The single entry trigger',
    { source: sel('Source', ['SharePoint list']), list: str('List'), description: area('Description') },
    { source: 'SharePoint list', list: 'Hires & Leavers', description: 'A Project PMO or Lead submits a structured joiner record.' },
    ['out']),
  step('trigger.schedule', 'Triggers', 'Daily 9am check',
    'Recurring monitoring sweep',
    { cron: str('Cron'), description: area('Description') },
    { cron: '0 9 * * *', description: 'Sweeps all active onboarding plans.' },
    ['out']),

  // Validation & gates
  step('gate.validateEID', 'Validation & gates', 'Validate EID & fields',
    'Branches on EID outcome',
    { mandatoryFields: area('Mandatory fields'), resumeOn: str('Resume on') },
    {
      mandatoryFields: 'EID, career level, start/end date, location, project code (WBS), delivery type, FTE charge, project name, team, lead, capability, role ID',
      resumeOn: 'EID added',
    },
    ['in',
      { id: 'valid', direction: 'out', label: 'valid' },
      { id: 'missing', direction: 'out', label: 'missing' },
      { id: 'invalid', direction: 'out', label: 'invalid' }]),
  step('wait.pendingEID', 'Validation & gates', 'Wait for EID',
    'Suspend until data arrives',
    { resumeOn: str('Resume on'), escalateTo: str('Escalate to') },
    { resumeOn: 'EID added to record', escalateTo: '{{config.project_lead_email}}' }),
  step('notify.reject', 'Validation & gates', 'Reject & notify',
    'Invalid EID — stop',
    { to: str('Notify'), reason: str('Reason') },
    { to: '{{config.project_lead_email}}', reason: 'Invalid EID — cannot onboard' },
    ['in']),
  step('gate.allComplete', 'Validation & gates', 'All tasks complete?',
    'Completion join',
    { condition: str('Condition') },
    { condition: 'all Planner tasks complete (incl. N/A)' }),

  // Automated actions
  step('action.createPlan', 'Automated actions', 'Create Planner plan',
    'Operational control tower',
    { titleTemplate: str('Plan title template'), slaMinutes: num('SLA (minutes)'), writeBackField: str('Write-back field') },
    { titleTemplate: '{{record.name}} — Onboard — {{record.startDate}}', slaMinutes: 5, writeBackField: 'planner_plan_id' }),
  step('action.sharepointWrite', 'Automated actions', 'Write resource list',
    'Project SharePoint resource list',
    { listUrl: str('List URL'), fields: area('Fields'), onFailure: str('On failure') },
    { listUrl: '{{config.sharepoint_resource_list_url}}', fields: 'EID, career level, dates, location, company code, WBS, delivery type, FTE charge, project name, team, lead, capability, role ID, status=Active', onFailure: 'Manual Planner task + notify Lead/PMO' }),
  step('action.sendEmails', 'Automated actions', 'Send access emails',
    'Access request emails',
    { emails: area('Emails'), cc: str('CC'), slaMinutes: num('SLA (minutes)') },
    { emails: 'MMS→PMO/Lead; MME→CFM; CDP→CDP Mgr; WBS→CFM; MME contract→Delivery Lead; Client/VPN→PMO/Lead (draft)', cc: '{{config.project_pmo_email}}', slaMinutes: 2 }),
  step('action.graphAddGroups', 'Automated actions', 'Add mailing lists',
    'Mailing lists & Viva Engage',
    { groups: str('Groups'), fallback: str('Fallback'), retry: num('Retries') },
    { groups: '{{config.mailing_lists}}', fallback: 'Pre-filled WebAdmin Planner task', retry: 1 }),
  step('action.graphAddTeams', 'Automated actions', 'Add to Teams channel',
    'Graph POST /groups/{id}/members',
    { channels: str('Channels'), ownerIfLead: bool('Owner if PMO/Lead'), skipClientFacing: bool('Skip client-facing') },
    { channels: '{{config.teams_channel_ids}}', ownerIfLead: true, skipClientFacing: true }),
  step('action.teamsDM', 'Automated actions', 'Notify task owners',
    'Personalised Teams DMs',
    { audience: str('Audience'), includes: area('DM includes'), retry: num('Retries'), fallback: str('Fallback') },
    { audience: 'each task owner (own tasks only)', includes: 'joiner name, role, start date, Planner link, expected completion', retry: 1, fallback: 'email' }),

  // Agent-assisted tasks
  step('task.cdpRoro', 'Agent-assisted tasks', 'Prepare CDP RORO',
    'Agent prepares · human executes',
    { owner: str('Owner'), supervisor: str('Supervisor EID'), dueDate: str('Due date'), note: str('Note') },
    { owner: '{{config.cdp_owner_email}}', supervisor: '{{config.project_lead_email}}', dueDate: '{{record.startDate}}', note: 'Do NOT add personal number' }),
  step('task.myteWbs', 'Agent-assisted tasks', 'Prepare MyTE WBS',
    'Agent prepares · human executes',
    { owner: str('Owner'), link: str('MyTE link') },
    { owner: '{{config.myte_admin_email}}', link: 'MyTE authorize (pre-filled EID)' }),
  step('task.orgChart', 'Agent-assisted tasks', 'Prepare Org chart',
    'Human only — no API',
    { owner: str('Owner'), note: str('Note') },
    { owner: '{{config.project_lead_email}}', note: 'Human only — no standard API' }),

  // Monitoring & completion
  step('monitor.sla', 'Monitoring & completion', 'Monitor & escalate',
    'Reminders & escalation',
    { remindAfterH: num('Remind after (h)'), escalateAfterH: num('Escalate after (h)'), escalateTo: str('Escalate to'), accelerateTo: str('Accelerate to') },
    { remindAfterH: 24, escalateAfterH: 48, escalateTo: '{{config.project_pmo_email}}, {{config.project_lead_email}}', accelerateTo: 'PPSO Head (start < 24h)' }),
  step('notify.confirm', 'Monitoring & completion', 'Completion email',
    'Closes the onboarding loop',
    { to: str('To'), subject: str('Subject template'), includeNA: bool('Include N/A tasks') },
    { to: '{{record.email}}, {{config.project_lead_email}}, {{config.onshore_contacts}}', subject: 'Onboarding complete — {{record.name}} — {{record.project_code}}', includeNA: true },
    ['in']),
];

export const processCatalog = new NodeCatalog(definitions);

// ── Seed: the doc's project-level onboarding template ────────────────────────

export function buildOnboardingTemplate(service: VisualCanvasService): void {
  service.clear();

  const add = (type: string, id: string, x: number, y: number) =>
    service.addNode(processCatalog.createNode(type, x, y, {}, id));

  // Main flow (record submitted) — the gate branches on EID outcome.
  add('trigger.recordSubmitted', 'onSubmit', 40, 110);
  add('gate.validateEID', 'validate', 340, 110);
  add('notify.reject', 'reject', 340, 300);
  add('wait.pendingEID', 'waitEid', 340, 450);
  add('action.createPlan', 'plan', 660, 110);

  // Parallel work fanned out from the Planner plan
  const fanout: Array<[string, string]> = [
    ['action.sharepointWrite', 'sharepoint'],
    ['action.graphAddGroups', 'mailing'],
    ['action.graphAddTeams', 'teams'],
    ['action.sendEmails', 'emails'],
    ['task.cdpRoro', 'cdp'],
    ['task.myteWbs', 'myte'],
    ['task.orgChart', 'orgchart'],
    ['action.teamsDM', 'notify'],
  ];
  fanout.forEach(([type, id], i) => add(type, id, 960, 20 + i * 116));

  add('gate.allComplete', 'allDone', 1290, 400);
  add('notify.confirm', 'confirm', 1580, 400);

  // Monitoring sub-flow (daily schedule) — deliberately separate.
  add('trigger.schedule', 'onSchedule', 40, 660);
  add('monitor.sla', 'monitor', 340, 660);

  let e = 0;
  const link = (from: string, to: string, src = 'out') =>
    service.addEdge(new Edge({
      id: `e${++e}`,
      sourcePortId: `${from}:${src}`,
      targetPortId: `${to}:in`,
      type: 'smoothstep',
      markerEnd: 'arrowclosed',
    }));

  link('onSubmit', 'validate');
  link('validate', 'plan', 'valid');
  link('validate', 'waitEid', 'missing');
  link('validate', 'reject', 'invalid');
  link('waitEid', 'plan'); // resume once the EID arrives
  for (const [, id] of fanout) link('plan', id);
  for (const [, id] of fanout) link(id, 'allDone');
  link('allDone', 'confirm');
  link('onSchedule', 'monitor');
}
