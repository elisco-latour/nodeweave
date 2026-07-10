import { Edge, type VisualCanvasService } from '@nodeweave/angular';

export type Scenario = 'valid' | 'missing' | 'invalid';
export type RunState = 'running' | 'done' | 'skipped' | 'waiting';

const RUN = '__run';
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Non-undoable node-state write: mutate config in place + nudge configTick. */
function setRun(service: VisualCanvasService, id: string, state: RunState | null): void {
  const node = service.state.nodes.get(id);
  if (!node) return;
  // New object reference (not in-place) so signal computeds re-run, matching
  // how the engine's updateNodeConfig replaces config.
  const cfg = { ...((node.metadata.config as Record<string, unknown> | undefined) ?? {}) };
  if (state === null) delete cfg[RUN];
  else cfg[RUN] = state;
  node.metadata.config = cfg;
  service.state.dispatchEvent(new CustomEvent('node-config-updated', { detail: { nodeId: id, config: cfg } }));
}

/** Replace an edge with a copy carrying a run-highlight (or clear it). */
function replaceEdge(service: VisualCanvasService, id: string, animated: boolean, className: string | null): void {
  const state = service.state;
  const e = state.edges.get(id);
  if (!e) return;
  const j = e.toJSON();
  state.edges.set(id, new Edge({
    id: j.id,
    sourcePortId: j.sourcePortId,
    targetPortId: j.targetPortId,
    type: j.type,
    label: j.label,
    animated,
    markerEnd: j.markerEnd,
    data: className ? { className } : undefined,
  }));
  state.dispatchEvent(new CustomEvent('edge-added', { detail: { edgeId: id } }));
}

function setEdgeState(service: VisualCanvasService, id: string, className: 'run-ok' | 'run-fail', animated: boolean): void {
  replaceEdge(service, id, animated, className);
}

/** Clear all run-state highlights (nodes and edges). */
export function clearRunStates(service: VisualCanvasService): void {
  for (const node of service.state.nodes.values()) {
    if (node.metadata.config && RUN in node.metadata.config) setRun(service, node.id, null);
  }
  for (const e of [...service.state.edges.values()]) {
    const cn = e.data?.['className'];
    if (cn === 'run-ok' || cn === 'run-fail') replaceEdge(service, e.id, false, null);
  }
}

export interface RunOptions {
  scenario: Scenario;
  onLog: (line: string) => void;
  isCancelled: () => boolean;
}

/**
 * Animate an end-to-end dry-run of the authored process. At the validation
 * gate the chosen `scenario` decides which branch is taken (other branches are
 * greyed out); wait nodes pause then resume. This is a design-time simulation,
 * not the real runtime engine — branch outcomes come from the scenario, not
 * live data.
 */
export async function runSimulation(service: VisualCanvasService, opts: RunOptions): Promise<void> {
  const { scenario, onLog, isCancelled } = opts;
  const state = service.state;
  const nodes = [...state.nodes.values()];
  const orderIndex = new Map(nodes.map((n, i) => [n.id, i]));
  const title = (id: string) => {
    const n = state.nodes.get(id);
    return (n?.metadata.config?.['title'] as string) || n?.type || id;
  };

  // Adjacency with branch labels.
  const out = new Map<string, { to: string; branch: string | null; edgeId: string }[]>();
  for (const n of nodes) out.set(n.id, []);
  for (const e of state.edges.values()) {
    const sp = state.getPort(e.sourcePortId);
    const tp = state.getPort(e.targetPortId);
    if (!sp || !tp) continue;
    out.get(sp.nodeId)?.push({ to: tp.nodeId, branch: sp.label ?? null, edgeId: e.id });
  }
  // Live edges: at a branching node keep only the chosen scenario's branch.
  const live = (id: string) => {
    const edges = out.get(id) ?? [];
    return edges.some((x) => x.branch) ? edges.filter((x) => x.branch === scenario) : edges;
  };

  // Reachable set from all triggers, following live edges only.
  const reachable = new Set<string>();
  const stack = nodes.filter((n) => n.type.startsWith('trigger.')).map((n) => n.id);
  while (stack.length) {
    const id = stack.pop()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    for (const nx of live(id)) if (!reachable.has(nx.to)) stack.push(nx.to);
  }

  // Topological order over the reachable subgraph (stable by insertion order).
  const indeg = new Map<string, number>();
  for (const id of reachable) indeg.set(id, 0);
  for (const id of reachable) for (const nx of live(id)) if (reachable.has(nx.to)) indeg.set(nx.to, (indeg.get(nx.to) ?? 0) + 1);
  const queue = [...reachable].filter((id) => (indeg.get(id) ?? 0) === 0).sort((a, b) => orderIndex.get(a)! - orderIndex.get(b)!);
  const seen = new Set(queue);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const nx of live(id)) {
      if (!reachable.has(nx.to)) continue;
      indeg.set(nx.to, indeg.get(nx.to)! - 1);
      if (indeg.get(nx.to) === 0 && !seen.has(nx.to)) { queue.push(nx.to); seen.add(nx.to); }
    }
  }

  // Incoming live edges per node — used to stop an edge animating once its
  // target node completes (badge received).
  const incoming = new Map<string, { edgeId: string; branch: string | null }[]>();
  for (const n of nodes) incoming.set(n.id, []);
  for (const src of reachable) for (const nx of live(src)) incoming.get(nx.to)?.push({ edgeId: nx.edgeId, branch: nx.branch });

  // Reset, then grey out the branches not taken.
  clearRunStates(service);
  for (const n of nodes) if (!reachable.has(n.id)) setRun(service, n.id, 'skipped');

  onLog(`▶ Dry-run · EID ${scenario}`);
  for (const id of order) {
    if (isCancelled()) { onLog('■ Stopped'); return; }
    const node = state.nodes.get(id)!;
    setRun(service, id, 'running');
    onLog(`● ${title(id)}`);
    await wait(420);

    if (node.type.startsWith('wait.')) {
      setRun(service, id, 'waiting');
      onLog(`   ⏳ waiting — ${(node.metadata.config?.['resumeOn'] as string) ?? 'resume'}`);
      await wait(1200);
      if (isCancelled()) { onLog('■ Stopped'); return; }
      onLog('   ▸ resumed');
    }

    setRun(service, id, 'done');
    // Flow has arrived — stop this node's incoming edges animating (now solid).
    for (const inc of incoming.get(id) ?? [])
      setEdgeState(service, inc.edgeId, inc.branch === 'invalid' ? 'run-fail' : 'run-ok', false);
    // Flow now leaves this node — animate its outgoing edges until their target completes.
    for (const nx of live(id))
      setEdgeState(service, nx.edgeId, nx.branch === 'invalid' ? 'run-fail' : 'run-ok', true);
    await wait(140);
  }
  onLog(scenario === 'invalid' ? '✓ Rejected — no plan created' : '✓ Onboarding complete');
}
