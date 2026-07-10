import { CommandHistory } from './command-history.js';
import type { Command } from './command-history.js';
import { Node, Port, Edge } from './graph.js';
import type { NodeJSON, EdgeJSON } from './graph.js';
import type { CanvasStateOptions, Viewport, NodeGeometry } from '../types.js';

export type { Viewport };

export interface CanvasStateJSON {
  nodes: NodeJSON[];
  edges: EdgeJSON[];
  viewport: Viewport;
}

interface ClipboardData {
  nodes: NodeJSON[];
  edges: EdgeJSON[];
}

// ─── Commands ────────────────────────────────────────────────────────────────

class AddNodeCommand implements Command {
  readonly #state: CanvasState;
  readonly #node: Node;

  constructor(canvasState: CanvasState, node: Node) {
    this.#state = canvasState;
    this.#node = node;
  }

  execute(): void {
    this.#state.nodes.set(this.#node.id, this.#node);
    this.#state.dispatchEvent(new CustomEvent('node-added', {
      detail: { node: this.#node, nodeId: this.#node.id },
    }));
  }

  undo(): void {
    this.#state.nodes.delete(this.#node.id);
    this.#state.dispatchEvent(new CustomEvent('node-removed', {
      detail: { node: this.#node, nodeId: this.#node.id },
    }));
  }
}

class RemoveNodeCommand implements Command {
  readonly #state: CanvasState;
  readonly #nodeId: string;
  #node: Node | undefined;
  #removedEdges: Edge[] = [];

  constructor(canvasState: CanvasState, nodeId: string) {
    this.#state = canvasState;
    this.#nodeId = nodeId;
  }

  execute(): void {
    this.#node = this.#state.nodes.get(this.#nodeId);
    if (!this.#node) throw new Error(`Node "${this.#nodeId}" not found.`);

    const portIds = new Set(this.#node.ports.keys());
    this.#removedEdges = [];
    for (const [edgeId, edge] of this.#state.edges) {
      if (portIds.has(edge.sourcePortId) || portIds.has(edge.targetPortId)) {
        this.#removedEdges.push(edge);
        this.#state.edges.delete(edgeId);
        this.#state.dispatchEvent(new CustomEvent('edge-removed', { detail: { edge, edgeId } }));
      }
    }

    this.#state.nodes.delete(this.#nodeId);
    this.#state.dispatchEvent(new CustomEvent('node-removed', {
      detail: { node: this.#node, nodeId: this.#nodeId },
    }));
  }

  undo(): void {
    this.#state.nodes.set(this.#nodeId, this.#node!);
    this.#state.dispatchEvent(new CustomEvent('node-added', {
      detail: { node: this.#node, nodeId: this.#nodeId },
    }));
    for (const edge of this.#removedEdges) {
      this.#state.edges.set(edge.id, edge);
      this.#state.dispatchEvent(new CustomEvent('edge-added', { detail: { edge, edgeId: edge.id } }));
    }
  }
}

class MoveNodeCommand implements Command {
  readonly #state: CanvasState;
  readonly #nodeId: string;
  readonly #newX: number;
  readonly #newY: number;
  readonly #oldX: number;
  readonly #oldY: number;

  constructor(canvasState: CanvasState, nodeId: string, newX: number, newY: number) {
    this.#state = canvasState;
    this.#nodeId = nodeId;
    this.#newX = newX;
    this.#newY = newY;
    const node = canvasState.nodes.get(nodeId);
    if (!node) throw new Error(`Node "${nodeId}" not found.`);
    this.#oldX = node.x;
    this.#oldY = node.y;
  }

  execute(): void {
    const node = this.#state.nodes.get(this.#nodeId)!;
    node.x = this.#newX;
    node.y = this.#newY;
    this.#state.dispatchEvent(new CustomEvent('node-moved', {
      detail: { nodeId: this.#nodeId, x: this.#newX, y: this.#newY },
    }));
  }

  undo(): void {
    const node = this.#state.nodes.get(this.#nodeId)!;
    node.x = this.#oldX;
    node.y = this.#oldY;
    this.#state.dispatchEvent(new CustomEvent('node-moved', {
      detail: { nodeId: this.#nodeId, x: this.#oldX, y: this.#oldY },
    }));
  }
}

class ResizeNodeCommand implements Command {
  readonly #state: CanvasState;
  readonly #nodeId: string;
  readonly #newGeom: NodeGeometry;
  readonly #oldGeom: NodeGeometry;

  constructor(canvasState: CanvasState, nodeId: string, geom: NodeGeometry) {
    this.#state = canvasState;
    this.#nodeId = nodeId;
    this.#newGeom = { ...geom };
    const node = canvasState.nodes.get(nodeId);
    if (!node) throw new Error(`Node "${nodeId}" not found.`);
    this.#oldGeom = { x: node.x, y: node.y, width: node.width, height: node.height };
  }

  execute(): void { this.#apply(this.#newGeom); }
  undo(): void { this.#apply(this.#oldGeom); }

  #apply(g: NodeGeometry): void {
    const node = this.#state.nodes.get(this.#nodeId)!;
    node.x = g.x;
    node.y = g.y;
    node.width = g.width;
    node.height = g.height;
    this.#state.dispatchEvent(new CustomEvent('node-resized', {
      detail: { nodeId: this.#nodeId, x: g.x, y: g.y, width: g.width, height: g.height },
    }));
  }
}

class AddEdgeCommand implements Command {
  readonly #state: CanvasState;
  readonly #edge: Edge;

  constructor(canvasState: CanvasState, edge: Edge) {
    this.#state = canvasState;
    this.#edge = edge;
  }

  execute(): void {
    const sourcePort = this.#state._findPort(this.#edge.sourcePortId);
    if (!sourcePort) throw new Error(`Source port "${this.#edge.sourcePortId}" not found.`);
    const targetPort = this.#state._findPort(this.#edge.targetPortId);
    if (!targetPort) throw new Error(`Target port "${this.#edge.targetPortId}" not found.`);
    if (sourcePort.direction !== 'out') {
      throw new Error(`Source port "${sourcePort.id}" must have direction "out".`);
    }
    if (targetPort.direction !== 'in') {
      throw new Error(`Target port "${targetPort.id}" must have direction "in".`);
    }
    if (sourcePort.nodeId === targetPort.nodeId) {
      throw new Error('Self-loops are not allowed.');
    }

    const validator = this.#state._options.isValidConnection;
    if (validator && !validator(this.#edge.sourcePortId, this.#edge.targetPortId)) {
      throw new Error('Connection rejected by isValidConnection.');
    }

    this.#state.edges.set(this.#edge.id, this.#edge);
    if (this.#state.hasCycle()) {
      this.#state.edges.delete(this.#edge.id);
      throw new Error('Adding this edge would create a cycle.');
    }

    this.#state.dispatchEvent(new CustomEvent('edge-added', {
      detail: { edge: this.#edge, edgeId: this.#edge.id },
    }));
  }

  undo(): void {
    this.#state.edges.delete(this.#edge.id);
    this.#state.dispatchEvent(new CustomEvent('edge-removed', {
      detail: { edge: this.#edge, edgeId: this.#edge.id },
    }));
  }
}

class RemoveEdgeCommand implements Command {
  readonly #state: CanvasState;
  readonly #edgeId: string;
  #edge: Edge | undefined;

  constructor(canvasState: CanvasState, edgeId: string) {
    this.#state = canvasState;
    this.#edgeId = edgeId;
  }

  execute(): void {
    this.#edge = this.#state.edges.get(this.#edgeId);
    if (!this.#edge) throw new Error(`Edge "${this.#edgeId}" not found.`);
    this.#state.edges.delete(this.#edgeId);
    this.#state.dispatchEvent(new CustomEvent('edge-removed', {
      detail: { edge: this.#edge, edgeId: this.#edgeId },
    }));
  }

  undo(): void {
    this.#state.edges.set(this.#edgeId, this.#edge!);
    this.#state.dispatchEvent(new CustomEvent('edge-added', {
      detail: { edge: this.#edge, edgeId: this.#edgeId },
    }));
  }
}

class UpdateNodeConfigCommand implements Command {
  readonly #state: CanvasState;
  readonly #nodeId: string;
  readonly #newConfig: Record<string, unknown>;
  readonly #oldConfig: Record<string, unknown>;

  constructor(canvasState: CanvasState, nodeId: string, newConfig: Record<string, unknown>) {
    this.#state = canvasState;
    this.#nodeId = nodeId;
    this.#newConfig = { ...newConfig };
    const node = canvasState.nodes.get(nodeId);
    if (!node) throw new Error(`Node "${nodeId}" not found.`);
    this.#oldConfig = { ...(node.metadata.config ?? {}) };
  }

  execute(): void {
    const node = this.#state.nodes.get(this.#nodeId)!;
    node.metadata.config = { ...this.#newConfig };
    this.#state.dispatchEvent(new CustomEvent('node-config-updated', {
      detail: { nodeId: this.#nodeId, config: node.metadata.config },
    }));
  }

  undo(): void {
    const node = this.#state.nodes.get(this.#nodeId)!;
    node.metadata.config = { ...this.#oldConfig };
    this.#state.dispatchEvent(new CustomEvent('node-config-updated', {
      detail: { nodeId: this.#nodeId, config: node.metadata.config },
    }));
  }
}

class BatchCommand implements Command {
  readonly #commands: Command[];

  constructor(commands: Command[]) {
    this.#commands = commands;
  }

  execute(): void {
    for (const cmd of this.#commands) cmd.execute();
  }

  undo(): void {
    for (let i = this.#commands.length - 1; i >= 0; i--) {
      this.#commands[i].undo();
    }
  }
}

class PasteCommand implements Command {
  readonly #state: CanvasState;
  readonly #nodes: Node[];
  readonly #edges: Edge[];
  #addedNodeIds: string[] = [];
  #addedEdgeIds: string[] = [];

  constructor(canvasState: CanvasState, nodes: Node[], edges: Edge[]) {
    this.#state = canvasState;
    this.#nodes = nodes;
    this.#edges = edges;
  }

  execute(): void {
    this.#addedNodeIds = [];
    this.#addedEdgeIds = [];
    for (const node of this.#nodes) {
      this.#state.nodes.set(node.id, node);
      this.#addedNodeIds.push(node.id);
      this.#state.dispatchEvent(new CustomEvent('node-added', { detail: { node, nodeId: node.id } }));
    }
    for (const edge of this.#edges) {
      this.#state.edges.set(edge.id, edge);
      this.#addedEdgeIds.push(edge.id);
      this.#state.dispatchEvent(new CustomEvent('edge-added', { detail: { edge, edgeId: edge.id } }));
    }
  }

  undo(): void {
    for (const edgeId of this.#addedEdgeIds) {
      const edge = this.#state.edges.get(edgeId);
      this.#state.edges.delete(edgeId);
      if (edge) {
        this.#state.dispatchEvent(new CustomEvent('edge-removed', { detail: { edge, edgeId } }));
      }
    }
    for (const nodeId of this.#addedNodeIds) {
      const node = this.#state.nodes.get(nodeId);
      this.#state.nodes.delete(nodeId);
      if (node) {
        this.#state.dispatchEvent(new CustomEvent('node-removed', { detail: { node, nodeId } }));
      }
    }
  }
}

// ─── CanvasState ─────────────────────────────────────────────────────────────

/**
 * Central state manager for the pipeline canvas.
 * Extends EventTarget — all mutations go through CommandHistory.
 *
 * Events: node-added, node-removed, node-moved, node-resized, edge-added,
 *         edge-removed, node-config-updated, viewport-changed,
 *         selection-changed, state-reset.
 */
export class CanvasState extends EventTarget {
  readonly nodes: Map<string, Node> = new Map();
  readonly edges: Map<string, Edge> = new Map();
  #viewport: Viewport = { panX: 0, panY: 0, zoom: 1 };
  readonly #selectedNodeIds: Set<string> = new Set();
  readonly #commandHistory: CommandHistory = new CommandHistory();
  #clipboard: ClipboardData | null = null;
  #pasteCounter = 0;

  /** @internal — used by command classes in this module. */
  readonly _options: CanvasStateOptions;

  constructor(options: CanvasStateOptions = {}) {
    super();
    this._options = options;

    if (options.onConnect) {
      this.addEventListener('edge-added', (e: Event) => {
        const { edge } = (e as CustomEvent<{ edge: Edge; edgeId: string }>).detail;
        options.onConnect!(edge.sourcePortId, edge.targetPortId);
      });
    }
    if (options.onNodesChange) {
      const cb = options.onNodesChange;
      this.addEventListener('node-added', () => cb());
      this.addEventListener('node-removed', () => cb());
    }
    if (options.onEdgesChange) {
      const cb = options.onEdgesChange;
      this.addEventListener('edge-added', () => cb());
      this.addEventListener('edge-removed', () => cb());
    }
  }

  get viewport(): Viewport { return this.#viewport; }
  get selectedNodeIds(): Set<string> { return this.#selectedNodeIds; }
  get commandHistory(): CommandHistory { return this.#commandHistory; }

  // ─── Node mutations ───────────────────────────────────────────────────────

  addNode(node: Node): void {
    this.#commandHistory.execute(new AddNodeCommand(this, node));
  }

  removeNode(nodeId: string): void {
    this.#commandHistory.execute(new RemoveNodeCommand(this, nodeId));
  }

  setNodePosition(nodeId: string, x: number, y: number): void {
    this.#commandHistory.execute(new MoveNodeCommand(this, nodeId, x, y));
  }

  setNodePositions(positionMap: Map<string, { x: number; y: number }>): void {
    const commands: Command[] = [];
    for (const [nodeId, { x, y }] of positionMap) {
      commands.push(new MoveNodeCommand(this, nodeId, x, y));
    }
    if (commands.length === 1) {
      this.#commandHistory.execute(commands[0]);
    } else if (commands.length > 1) {
      this.#commandHistory.execute(new BatchCommand(commands));
    }
  }

  /** Resize (and optionally reposition) a node. Undoable. */
  resizeNode(nodeId: string, geom: NodeGeometry): void {
    this.#commandHistory.execute(new ResizeNodeCommand(this, nodeId, geom));
  }

  // ─── Edge mutations ───────────────────────────────────────────────────────

  addEdge(edge: Edge): void {
    this.#commandHistory.execute(new AddEdgeCommand(this, edge));
  }

  removeEdge(edgeId: string): void {
    this.#commandHistory.execute(new RemoveEdgeCommand(this, edgeId));
  }

  // ─── Config mutations ─────────────────────────────────────────────────────

  updateNodeConfig(nodeId: string, config: Record<string, unknown>): void {
    this.#commandHistory.execute(new UpdateNodeConfigCommand(this, nodeId, config));
  }

  // ─── Non-undoable direct mutations ───────────────────────────────────────

  moveNodeDirect(nodeId: string, x: number, y: number): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    node.x = x;
    node.y = y;
    this.dispatchEvent(new CustomEvent('node-moved', { detail: { nodeId, x, y } }));
  }

  /** Live resize preview (non-undoable). Commit with resizeNode(). */
  resizeNodeDirect(nodeId: string, x: number, y: number, width: number, height: number): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;
    node.x = x;
    node.y = y;
    node.width = width;
    node.height = height;
    this.dispatchEvent(new CustomEvent('node-resized', {
      detail: { nodeId, x, y, width, height },
    }));
  }

  setViewport(panX: number, panY: number, zoom: number): void {
    this.#viewport = { panX, panY, zoom };
    this.dispatchEvent(new CustomEvent('viewport-changed', { detail: { panX, panY, zoom } }));
  }

  // ─── Selection ───────────────────────────────────────────────────────────

  selectNode(nodeId: string): void {
    this.#selectedNodeIds.clear();
    this.#selectedNodeIds.add(nodeId);
    this.#dispatchSelectionChanged();
  }

  toggleNodeSelection(nodeId: string): void {
    if (this.#selectedNodeIds.has(nodeId)) {
      this.#selectedNodeIds.delete(nodeId);
    } else {
      this.#selectedNodeIds.add(nodeId);
    }
    this.#dispatchSelectionChanged();
  }

  clearSelection(): void {
    this.#selectedNodeIds.clear();
    this.#dispatchSelectionChanged();
  }

  selectNodes(nodeIds: string[]): void {
    this.#selectedNodeIds.clear();
    for (const id of nodeIds) this.#selectedNodeIds.add(id);
    this.#dispatchSelectionChanged();
  }

  #dispatchSelectionChanged(): void {
    this.dispatchEvent(new CustomEvent('selection-changed', {
      detail: { selectedIds: new Set(this.#selectedNodeIds) },
    }));
  }

  // ─── Port lookup ─────────────────────────────────────────────────────────

  getPort(portId: string): Port | null {
    return this._findPort(portId);
  }

  /** @internal — used by command classes in this module. */
  _findPort(portId: string): Port | null {
    for (const node of this.nodes.values()) {
      const port = node.ports.get(portId);
      if (port) return port;
    }
    return null;
  }

  // ─── Copy / Paste / Duplicate ─────────────────────────────────────────────

  copySelection(): void {
    if (this.#selectedNodeIds.size === 0) return;

    const selectedIds = new Set(this.#selectedNodeIds);
    const nodeData: NodeJSON[] = [];
    const selectedPortIds = new Set<string>();

    for (const nodeId of selectedIds) {
      const node = this.nodes.get(nodeId);
      if (node) {
        nodeData.push(node.toJSON());
        for (const portId of node.ports.keys()) selectedPortIds.add(portId);
      }
    }

    const edgeData: EdgeJSON[] = [];
    for (const edge of this.edges.values()) {
      if (selectedPortIds.has(edge.sourcePortId) && selectedPortIds.has(edge.targetPortId)) {
        edgeData.push(edge.toJSON());
      }
    }

    this.#clipboard = { nodes: nodeData, edges: edgeData };
  }

  paste(): void {
    if (!this.#clipboard || this.#clipboard.nodes.length === 0) return;

    this.#pasteCounter++;
    const offset = 20 * this.#pasteCounter;
    const portIdMap = new Map<string, string>();

    const newNodes: Node[] = [];
    for (const nodeData of this.#clipboard.nodes) {
      const newId = `${nodeData.id}-copy-${this.#pasteCounter}-${Date.now()}`;

      const newNode = new Node({
        id: newId,
        type: nodeData.type,
        x: nodeData.x + offset,
        y: nodeData.y + offset,
        metadata: nodeData.metadata ? { ...nodeData.metadata } : {},
      });
      newNode.width = nodeData.width;
      newNode.height = nodeData.height;

      for (const portData of nodeData.ports) {
        const newPortId = `${newId}:${portData.id.split(':').pop()}`;
        portIdMap.set(portData.id, newPortId);
        newNode.addPort(new Port({
          id: newPortId,
          direction: portData.direction,
          nodeId: newId,
          positionHint: portData.positionHint ?? undefined,
          label: portData.label,
        }));
      }

      newNodes.push(newNode);
    }

    const newEdges: Edge[] = [];
    for (const edgeData of this.#clipboard.edges) {
      const newSourcePortId = portIdMap.get(edgeData.sourcePortId);
      const newTargetPortId = portIdMap.get(edgeData.targetPortId);
      if (newSourcePortId && newTargetPortId) {
        newEdges.push(new Edge({
          id: `${edgeData.id}-copy-${this.#pasteCounter}-${Date.now()}`,
          sourcePortId: newSourcePortId,
          targetPortId: newTargetPortId,
          type: edgeData.type,
          label: edgeData.label,
          animated: edgeData.animated,
          markerEnd: edgeData.markerEnd,
          data: edgeData.data,
        }));
      }
    }

    this.#commandHistory.execute(new PasteCommand(this, newNodes, newEdges));
  }

  duplicate(): void {
    this.copySelection();
    this.paste();
  }

  // ─── Cycle detection ──────────────────────────────────────────────────────

  hasCycle(): boolean {
    const adj = new Map<string, Set<string>>();
    for (const node of this.nodes.values()) adj.set(node.id, new Set());
    for (const edge of this.edges.values()) {
      const sourcePort = this._findPort(edge.sourcePortId);
      const targetPort = this._findPort(edge.targetPortId);
      if (sourcePort && targetPort) {
        adj.get(sourcePort.nodeId)!.add(targetPort.nodeId);
      }
    }

    const color = new Map<string, 0 | 1 | 2>();
    for (const nodeId of adj.keys()) color.set(nodeId, 0);

    const dfs = (nodeId: string): boolean => {
      color.set(nodeId, 1);
      for (const neighbor of adj.get(nodeId) ?? []) {
        if (color.get(neighbor) === 1) return true;
        if (color.get(neighbor) === 0 && dfs(neighbor)) return true;
      }
      color.set(nodeId, 2);
      return false;
    };

    for (const nodeId of adj.keys()) {
      if (color.get(nodeId) === 0 && dfs(nodeId)) return true;
    }
    return false;
  }

  // ─── Serialization ────────────────────────────────────────────────────────

  toJSON(): CanvasStateJSON {
    return {
      nodes: Array.from(this.nodes.values(), (n) => n.toJSON()),
      edges: Array.from(this.edges.values(), (e) => e.toJSON()),
      viewport: { ...this.#viewport },
    };
  }

  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.#selectedNodeIds.clear();
    this.#commandHistory.clear();
    this.#viewport = { panX: 0, panY: 0, zoom: 1 };
    this.dispatchEvent(new CustomEvent('state-reset'));
  }

  loadFromJSON(json: CanvasStateJSON): void {
    this.nodes.clear();
    this.edges.clear();
    this.#selectedNodeIds.clear();
    this.#commandHistory.clear();

    for (const nodeData of json.nodes) {
      const { ports: portsData, ...rest } = nodeData;
      const node = new Node(rest);
      for (const portData of portsData) {
        node.addPort(new Port({ ...portData, positionHint: portData.positionHint ?? undefined }));
      }
      this.nodes.set(node.id, node);
    }
    for (const edgeData of json.edges) {
      this.edges.set(edgeData.id, new Edge(edgeData));
    }
    if (json.viewport) {
      this.#viewport = { ...json.viewport };
    }
    this.dispatchEvent(new CustomEvent('state-reset'));
  }

  static fromJSON(json: CanvasStateJSON, options?: CanvasStateOptions): CanvasState {
    const state = new CanvasState(options);
    for (const nodeData of json.nodes) {
      const { ports: portsData, ...rest } = nodeData;
      const node = new Node(rest);
      for (const portData of portsData) {
        node.addPort(new Port({ ...portData, positionHint: portData.positionHint ?? undefined }));
      }
      state.nodes.set(node.id, node);
    }
    for (const edgeData of json.edges) {
      state.edges.set(edgeData.id, new Edge(edgeData));
    }
    if (json.viewport) {
      state.#viewport = { ...json.viewport };
    }
    return state;
  }
}
