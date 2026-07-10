import type { VisualCanvasService, Node } from '@nodeweave/angular';

export interface WorkflowNodeSpec {
  id: string;
  type: string;
  name?: string;
  with?: Record<string, unknown>;
  next: string[];
}

export interface WorkflowSpec {
  name: string;
  version: number;
  triggers: WorkflowNodeSpec[];
  steps: WorkflowNodeSpec[];
}

/**
 * Compile the authored graph into a canonical, layout-free workflow spec the
 * agent can follow: triggers and steps in topological order, each carrying its
 * config as `with` and its downstream node ids as `next`.
 */
export function compileToWorkflow(
  service: VisualCanvasService,
  opts: { name?: string; version?: number } = {},
): WorkflowSpec {
  const state = service.state;
  const nodes = [...state.nodes.values()];

  const outgoing = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  for (const n of nodes) {
    outgoing.set(n.id, []);
    indegree.set(n.id, 0);
  }
  for (const edge of state.edges.values()) {
    const s = state.getPort(edge.sourcePortId)?.nodeId;
    const t = state.getPort(edge.targetPortId)?.nodeId;
    if (!s || !t || !outgoing.has(s) || !indegree.has(t)) continue;
    outgoing.get(s)!.push(t);
    indegree.set(t, (indegree.get(t) ?? 0) + 1);
  }

  // Kahn topological sort, stable in original insertion order.
  const order: Node[] = [];
  const queued = new Set<string>();
  const queue = nodes.filter((n) => (indegree.get(n.id) ?? 0) === 0);
  queue.forEach((n) => queued.add(n.id));
  const deg = new Map(indegree);
  while (queue.length) {
    const n = queue.shift()!;
    order.push(n);
    for (const m of outgoing.get(n.id) ?? []) {
      deg.set(m, (deg.get(m) ?? 0) - 1);
      if ((deg.get(m) ?? 0) === 0 && !queued.has(m)) {
        const node = state.nodes.get(m);
        if (node) {
          queue.push(node);
          queued.add(m);
        }
      }
    }
  }
  // Any nodes left (detached / cyclic) keep their original order.
  if (order.length < nodes.length) {
    const seen = new Set(order.map((n) => n.id));
    for (const n of nodes) if (!seen.has(n.id)) order.push(n);
  }

  const toSpec = (n: Node): WorkflowNodeSpec => {
    const cfg = { ...((n.metadata.config as Record<string, unknown> | undefined) ?? {}) };
    const name = typeof cfg['title'] === 'string' ? (cfg['title'] as string) : undefined;
    delete cfg['title'];
    for (const k of Object.keys(cfg)) if (k.startsWith('__')) delete cfg[k]; // internal/preview keys
    const spec: Record<string, unknown> = { id: n.id, type: n.type };
    if (name) spec['name'] = name;
    if (Object.keys(cfg).length) spec['with'] = cfg;
    spec['next'] = [...(outgoing.get(n.id) ?? [])];
    return spec as unknown as WorkflowNodeSpec;
  };

  return {
    name: opts.name ?? 'project-onboarding',
    version: opts.version ?? 1,
    triggers: order.filter((n) => n.type.startsWith('trigger.')).map(toSpec),
    steps: order.filter((n) => !n.type.startsWith('trigger.')).map(toSpec),
  };
}

// ── Minimal YAML emitter (sufficient for the workflow spec shape) ────────────

const isScalar = (v: unknown): boolean => v === null || typeof v !== 'object';
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const isEmptyContainer = (v: unknown): boolean =>
  (Array.isArray(v) && v.length === 0) || (isPlainObject(v) && Object.keys(v).length === 0);

function scalar(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function inline(v: unknown): string {
  if (Array.isArray(v) && v.length === 0) return '[]';
  if (isPlainObject(v) && Object.keys(v).length === 0) return '{}';
  return scalar(v);
}

export function toYaml(value: unknown, indent = 0): string {
  const pad = '  '.repeat(indent);

  if (Array.isArray(value)) {
    if (value.length === 0) return pad + '[]';
    return value
      .map((item) => {
        if (isScalar(item)) return pad + '- ' + scalar(item);
        const entries = Object.entries(item as Record<string, unknown>).filter(([, v]) => v !== undefined);
        return entries
          .map(([k, v], i) => {
            const prefix = i === 0 ? pad + '- ' : pad + '  ';
            if (isScalar(v) || isEmptyContainer(v)) return prefix + k + ': ' + inline(v);
            return prefix + k + ':\n' + toYaml(v, indent + 2);
          })
          .join('\n');
      })
      .join('\n');
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return pad + '{}';
    return entries
      .map(([k, v]) => {
        if (isScalar(v) || isEmptyContainer(v)) return pad + k + ': ' + inline(v);
        return pad + k + ':\n' + toYaml(v, indent + 1);
      })
      .join('\n');
  }

  return pad + scalar(value);
}
