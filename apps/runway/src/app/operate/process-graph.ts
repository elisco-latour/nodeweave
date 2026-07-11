import { Node, Port, Edge, type VisualCanvasService } from '@nodeweave/angular';
import type { ReadinessRecord, Pathway, ReadinessItem } from '../domain/model';

/** Visual run-state of a node on the read-only case map. */
export type RunState = 'done' | 'active' | 'awaiting' | 'blocked' | 'pending' | 'skipped';
export type NodeKind = 'trigger' | 'gate' | 'item' | 'done';

interface GraphNode {
  id: string;          // for kind 'item', matches a readiness item id
  kind: NodeKind;
  label?: string;      // fixed label for trigger/gate/done; items take theirs from the case
  x: number;
  y: number;
  ports: Array<'in' | 'out'>;
}

interface ProcessGraph {
  nodes: GraphNode[];
  edges: Array<[from: string, to: string]>;
}

const T: GraphNode = { id: 'trigger', kind: 'trigger', label: 'Record submitted', x: 40, y: 214, ports: ['out'] };
const DONE: GraphNode = { id: 'done', kind: 'done', label: 'Ready for Day 1', x: 740, y: 214, ports: ['in'] };

const GRAPHS: Record<Pathway, ProcessGraph> = {
  'centre-level': {
    nodes: [
      { ...T },
      { id: 'gate', kind: 'gate', label: 'Validate', x: 250, y: 214, ports: ['in', 'out'] },
      { id: 'laptop', kind: 'item', x: 480, y: 30, ports: ['in', 'out'] },
      { id: 'm365', kind: 'item', x: 480, y: 118, ports: ['in', 'out'] },
      { id: 'desk', kind: 'item', x: 480, y: 206, ports: ['in', 'out'] },
      { id: 'orientation', kind: 'item', x: 480, y: 294, ports: ['in', 'out'] },
      { id: 'buddy', kind: 'item', x: 480, y: 382, ports: ['in', 'out'] },
      { ...DONE },
    ],
    edges: [
      ['trigger', 'gate'],
      ['gate', 'laptop'], ['gate', 'm365'], ['gate', 'desk'], ['gate', 'orientation'], ['gate', 'buddy'],
      ['laptop', 'done'], ['m365', 'done'], ['desk', 'done'], ['orientation', 'done'], ['buddy', 'done'],
    ],
  },
  'project-level': {
    nodes: [
      { ...T },
      { id: 'gate', kind: 'gate', label: 'Validate EID', x: 250, y: 214, ports: ['in', 'out'] },
      { id: 'access', kind: 'item', x: 480, y: 70, ports: ['in', 'out'] },
      { id: 'cdp', kind: 'item', x: 480, y: 158, ports: ['in', 'out'] },
      { id: 'teams', kind: 'item', x: 480, y: 246, ports: ['in', 'out'] },
      { id: 'myte', kind: 'item', x: 480, y: 334, ports: ['in', 'out'] },
      { ...DONE },
    ],
    edges: [
      ['trigger', 'gate'],
      ['gate', 'access'], ['gate', 'cdp'], ['gate', 'teams'], ['gate', 'myte'],
      ['access', 'done'], ['cdp', 'done'], ['teams', 'done'], ['myte', 'done'],
    ],
  },
};

const ITEM_RUN: Record<ReadinessItem['state'], RunState> = {
  done: 'done', blocked: 'blocked', 'awaiting-human': 'awaiting',
  'in-progress': 'active', pending: 'pending', skipped: 'skipped',
};

function gateRun(rec: ReadinessRecord): RunState {
  if (rec.state === 'draft' || rec.state === 'waiting-for-info' || rec.state === 'exception') return 'awaiting';
  if (rec.state === 'blocked' && rec.blockers.some((b) => b.kind === 'missing-info' || b.kind === 'conflicting-info')) return 'blocked';
  return 'done';
}

function nodeRun(node: GraphNode, rec: ReadinessRecord, item?: ReadinessItem): RunState {
  if (node.kind === 'trigger') return 'done';
  if (node.kind === 'gate') return gateRun(rec);
  if (node.kind === 'done') return rec.state === 'ready-for-day-1' || rec.state === 'completed' ? 'done' : 'pending';
  return item ? ITEM_RUN[item.state] : 'skipped';
}

/**
 * Populate the canvas service with a read-only map of the case's process,
 * each node lit by the case's current readiness state.
 */
export function buildCaseMap(service: VisualCanvasService, rec: ReadinessRecord): void {
  service.clear();
  const graph = GRAPHS[rec.pathway];
  const itemById = new Map(rec.items.map((i) => [i.id, i]));

  for (const gn of graph.nodes) {
    const item = itemById.get(gn.id);
    const label = gn.label ?? item?.label ?? gn.id;
    const node = new Node({
      id: gn.id, type: 'step', x: gn.x, y: gn.y,
      metadata: { config: { kind: gn.kind, label, runState: nodeRun(gn, rec, item), fulfilment: item?.fulfilment } },
    });
    node.width = 172;
    node.height = 58;
    for (const dir of gn.ports) node.addPort(new Port({ id: `${gn.id}:${dir}`, direction: dir, nodeId: gn.id }));
    service.addNode(node);
  }

  let e = 0;
  for (const [from, to] of graph.edges) {
    // Light an edge green once its target step is done.
    const target = itemById.get(to);
    const targetDone = to === 'done'
      ? rec.state === 'ready-for-day-1' || rec.state === 'completed'
      : target?.state === 'done';
    service.addEdge(new Edge({
      id: `e${++e}`,
      sourcePortId: `${from}:out`,
      targetPortId: `${to}:in`,
      type: 'smoothstep',
      markerEnd: 'arrowclosed',
      data: targetDone ? { className: 'rw-edge-done' } : undefined,
    }));
  }
}
