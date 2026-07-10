import { Edge } from '@nodeweave/angular';
import type { SchemaDefinition, SchemaField, VisualCanvasService } from '@nodeweave/angular';
import { NodeCatalog, type NodeTypeDefinition } from '@nodeweave/angular-authoring';
import { ProjectNodeComponent } from './project-node.component';
import { MetricNodeComponent } from './metric-node.component';

/** The node archetypes offered in the palette. */
export type MetricNodeType = 'project' | 'metric-input' | 'metric-northstar' | 'metric-kpi';

function metricDefaults(title: string, kind: string, aggregation: string): Record<string, unknown> {
  return {
    title,
    kind,
    aggregation,
    unit: '',
    v7d: '—',
    v6w: '—',
    v12m: '—',
    t7d: 0,
    t6w: 0,
    t12m: 0,
    hasGoal: false,
    goal: '',
    goalPercent: 0,
  };
}

// ── Config schemas (drive the inspector form + defaults) ─────────────────────

const showIfGoal: SchemaField['showIf'] = { field: 'hasGoal', operator: 'equals', value: true };

const metricSchema: SchemaDefinition = {
  fields: {
    title: { type: 'string', label: 'Title' },
    aggregation: { type: 'select', label: 'Aggregation', options: ['Sum', 'Average'] },
    unit: { type: 'string', label: 'Unit', placeholder: 'e.g. mins' },
    v7d: { type: 'string', label: 'Past 7 days' },
    v6w: { type: 'string', label: 'Past 6 weeks' },
    v12m: { type: 'string', label: 'Past 12 months' },
    t7d: { type: 'number', label: 'Trend · 7 days (%)', step: 0.01 },
    t6w: { type: 'number', label: 'Trend · 6 weeks (%)', step: 0.01 },
    t12m: { type: 'number', label: 'Trend · 12 months (%)', step: 0.01 },
    hasGoal: { type: 'boolean', label: 'Track a goal' },
    goal: { type: 'string', label: 'Goal', placeholder: 'e.g. 50,000 for 2026', showIf: showIfGoal },
    goalPercent: { type: 'number', label: 'Goal % complete', min: 0, max: 100, showIf: showIfGoal },
  },
};

const projectSchema: SchemaDefinition = {
  fields: {
    title: { type: 'string', label: 'Title' },
    source: { type: 'select', label: 'Source', options: ['Asana (Project)', 'Jira (Epic)'] },
    issues: { type: 'number', label: 'Issues', min: 0 },
    percent: { type: 'number', label: '% done', min: 0, max: 100 },
    status: { type: 'select', label: 'Status', options: ['To do', 'In progress', 'Done'] },
  },
};

// ── The catalog: one source of truth for palette, inspector, and factory ─────

const definitions: NodeTypeDefinition[] = [
  {
    type: 'project',
    label: 'Project / Epic',
    hint: 'A tracked initiative (Asana, Jira…)',
    icon: '▦',
    color: '#0ea5e9',
    category: 'Sources',
    width: 260,
    height: 116,
    ports: ['out'],
    defaults: { title: 'New initiative', source: 'Jira (Epic)', issues: 4, percent: 25, status: 'In progress' },
    configSchema: projectSchema,
    component: ProjectNodeComponent,
  },
  {
    type: 'metric-input',
    label: 'Input metric',
    hint: 'A leading indicator you can move',
    icon: '⌾',
    color: '#6366f1',
    category: 'Metrics',
    width: 260,
    height: 170,
    ports: ['in', 'out'],
    resizable: false,
    defaults: metricDefaults('Input metric', 'Input', 'Average'),
    configSchema: metricSchema,
    component: MetricNodeComponent,
  },
  {
    type: 'metric-northstar',
    label: 'North-star metric',
    hint: 'The one metric that matters most',
    icon: '★',
    color: '#f59e0b',
    category: 'Metrics',
    width: 300,
    height: 172,
    ports: ['in', 'out'],
    resizable: false,
    defaults: metricDefaults('North-star metric', 'North Star', 'Sum'),
    configSchema: metricSchema,
    component: MetricNodeComponent,
  },
  {
    type: 'metric-kpi',
    label: 'KPI metric',
    hint: 'A business outcome',
    icon: '◆',
    color: '#8b5cf6',
    category: 'Metrics',
    width: 260,
    height: 150,
    ports: ['in'],
    resizable: false,
    defaults: metricDefaults('New KPI', 'KPI', 'Sum'),
    configSchema: metricSchema,
    component: MetricNodeComponent,
  },
];

export const metricsCatalog = new NodeCatalog(definitions);

// ── Seed graph reproducing the mockup ────────────────────────────────────────

export function buildMockup(service: VisualCanvasService): void {
  service.clear();

  const n = (type: MetricNodeType, id: string, x: number, y: number, cfg: Record<string, unknown>) => {
    service.addNode(metricsCatalog.createNode(type, x, y, cfg, id));
  };

  // Column A — projects / epics
  n('project', 'marketing', 40, 60, {
    title: 'New marketing campaign', source: 'Asana (Project)', issues: 6, percent: 67, status: 'In progress',
  });
  n('project', 'social', 40, 240, {
    title: 'Social notifications', source: 'Jira (Epic)', issues: 4, percent: 50, status: 'To do',
  });
  n('project', 'timebased', 40, 420, {
    title: 'Time-based notifications', source: 'Jira (Epic)', issues: 1, percent: 100, status: 'Done',
  });
  n('project', 'aimodel', 40, 640, {
    title: 'AI model for song recommendations', source: 'Jira (Epic)', issues: 4, percent: 25, status: 'In progress',
  });
  n('project', 'sharing', 40, 880, {
    title: 'More prominent sharing prompts', source: 'Jira (Epic)', issues: 4, percent: 50, status: 'Done',
  });

  // Column B — input metrics
  n('metric-input', 'trial', 420, 80, {
    title: 'Premium trial users', aggregation: 'Sum', unit: '',
    v7d: '4,570', v6w: '26,958', v12m: '210,135', t7d: 0.87, t6w: 2.71, t12m: 38.26,
  });
  n('metric-input', 'sessions', 420, 300, {
    title: 'Avg. sessions per week', aggregation: 'Average', unit: '',
    v7d: '641.45', v6w: '633.3', v12m: '570.13', t7d: 1.04, t6w: 1.44, t12m: 39.7,
  });
  n('metric-input', 'duration', 420, 540, {
    title: 'Average session duration', aggregation: 'Sum', unit: '',
    v7d: '0', v6w: '0', v12m: '17,085.74', t7d: -100, t6w: -100, t12m: -56.99,
    hasGoal: true, goal: '50,000 for 2026', goalPercent: 34,
  });
  n('metric-input', 'shares', 420, 880, {
    title: 'Avg. shares per session', aggregation: 'Average', unit: '',
    v7d: '663.37', v6w: '658.83', v12m: '593.1', t7d: 0.51, t6w: 2.38, t12m: 33.18,
  });

  // Column C — north-star metric
  n('metric-northstar', 'listening', 830, 470, {
    title: 'Time spent listening to music by subscribers', aggregation: 'Sum', unit: 'mins',
    v7d: '4.41K', v6w: '26.15K', v12m: '198.31K', t7d: 0.43, t6w: 2.57, t12m: 38.59,
  });

  // Column D — KPI metrics
  n('metric-kpi', 'arr', 1240, 280, {
    title: 'ARR', aggregation: 'Sum', unit: '',
    v7d: '0', v6w: '-$60', v12m: '$56,760', t7d: 100, t6w: -100.17, t12m: 1676.67,
  });
  n('metric-kpi', 'retention', 1240, 470, {
    title: 'Monthly retention', aggregation: 'Average', unit: '',
    v7d: '72,315.8%', v6w: '71,521.9%', v12m: '63,825.8%', t7d: 0, t6w: 3.32, t12m: 37.7,
  });
  n('metric-kpi', 'subs', 1240, 680, {
    title: 'Monthly premium subscriptions', aggregation: 'Sum', unit: '',
    v7d: '5,417.23', v6w: '32,032.44', v12m: '246,597.93', t7d: 0.59, t6w: 3.14, t12m: 35.85,
  });

  // Edges — projects feed inputs (dimmed, unlabelled); metrics correlate (signed labels).
  const flow = (id: string, from: string, to: string) =>
    service.addEdge(new Edge({
      id, sourcePortId: `${from}:out`, targetPortId: `${to}:in`,
      type: 'bezier', markerEnd: 'arrow', data: { className: 'flow-dim' },
    }));

  const corr = (id: string, from: string, to: string, value: number) =>
    service.addEdge(new Edge({
      id, sourcePortId: `${from}:out`, targetPortId: `${to}:in`,
      type: 'bezier', label: value.toFixed(3),
      data: { className: value < 0 ? 'corr-neg' : 'corr-pos' },
    }));

  flow('f1', 'marketing', 'trial');
  flow('f2', 'social', 'sessions');
  flow('f3', 'timebased', 'sessions');
  flow('f4', 'aimodel', 'duration');
  flow('f5', 'sharing', 'shares');

  corr('c1', 'trial', 'listening', 0.998);
  corr('c2', 'sessions', 'listening', 0.998);
  corr('c3', 'duration', 'listening', -0.644);
  corr('c4', 'shares', 'listening', 0.999);

  corr('c5', 'listening', 'arr', 0.388);
  corr('c6', 'listening', 'retention', 0.999);
  corr('c7', 'listening', 'subs', 0.998);
}
