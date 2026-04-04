import { CommandHistory } from './command-history.js';
import { Node, Port, Edge } from './graph.js';

// ─── Commands ────────────────────────────────────────────────────────────────

class AddNodeCommand {
  #state;
  #node;

  constructor(canvasState, node) {
    this.#state = canvasState;
    this.#node = node;
  }

  execute() {
    this.#state.nodes.set(this.#node.id, this.#node);
    this.#state.dispatchEvent(
      new CustomEvent('node-added', { detail: { node: this.#node, nodeId: this.#node.id } }),
    );
  }

  undo() {
    this.#state.nodes.delete(this.#node.id);
    this.#state.dispatchEvent(
      new CustomEvent('node-removed', { detail: { node: this.#node, nodeId: this.#node.id } }),
    );
  }
}

class RemoveNodeCommand {
  #state;
  #nodeId;
  #node;
  #removedEdges = [];

  constructor(canvasState, nodeId) {
    this.#state = canvasState;
    this.#nodeId = nodeId;
  }

  execute() {
    this.#node = this.#state.nodes.get(this.#nodeId);
    if (!this.#node) {
      throw new Error(`Node "${this.#nodeId}" not found.`);
    }

    // Collect all edges connected to any port of this node
    const portIds = new Set(this.#node.ports.keys());
    this.#removedEdges = [];
    for (const [edgeId, edge] of this.#state.edges) {
      if (portIds.has(edge.sourcePortId) || portIds.has(edge.targetPortId)) {
        this.#removedEdges.push(edge);
        this.#state.edges.delete(edgeId);
        this.#state.dispatchEvent(
          new CustomEvent('edge-removed', { detail: { edge, edgeId } }),
        );
      }
    }

    this.#state.nodes.delete(this.#nodeId);
    this.#state.dispatchEvent(
      new CustomEvent('node-removed', { detail: { node: this.#node, nodeId: this.#nodeId } }),
    );
  }

  undo() {
    this.#state.nodes.set(this.#nodeId, this.#node);
    this.#state.dispatchEvent(
      new CustomEvent('node-added', { detail: { node: this.#node, nodeId: this.#nodeId } }),
    );

    for (const edge of this.#removedEdges) {
      this.#state.edges.set(edge.id, edge);
      this.#state.dispatchEvent(
        new CustomEvent('edge-added', { detail: { edge, edgeId: edge.id } }),
      );
    }
  }
}

class MoveNodeCommand {
  #state;
  #nodeId;
  #newX;
  #newY;
  #oldX;
  #oldY;

  constructor(canvasState, nodeId, newX, newY) {
    this.#state = canvasState;
    this.#nodeId = nodeId;
    this.#newX = newX;
    this.#newY = newY;
    const node = canvasState.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node "${nodeId}" not found.`);
    }
    this.#oldX = node.x;
    this.#oldY = node.y;
  }

  execute() {
    const node = this.#state.nodes.get(this.#nodeId);
    node.x = this.#newX;
    node.y = this.#newY;
    this.#state.dispatchEvent(
      new CustomEvent('node-moved', { detail: { nodeId: this.#nodeId, x: this.#newX, y: this.#newY } }),
    );
  }

  undo() {
    const node = this.#state.nodes.get(this.#nodeId);
    node.x = this.#oldX;
    node.y = this.#oldY;
    this.#state.dispatchEvent(
      new CustomEvent('node-moved', { detail: { nodeId: this.#nodeId, x: this.#oldX, y: this.#oldY } }),
    );
  }
}

class AddEdgeCommand {
  #state;
  #edge;

  constructor(canvasState, edge) {
    this.#state = canvasState;
    this.#edge = edge;
  }

  execute() {
    const sourcePort = this.#state._findPort(this.#edge.sourcePortId);
    if (!sourcePort) {
      throw new Error(`Source port "${this.#edge.sourcePortId}" not found.`);
    }
    const targetPort = this.#state._findPort(this.#edge.targetPortId);
    if (!targetPort) {
      throw new Error(`Target port "${this.#edge.targetPortId}" not found.`);
    }
    if (sourcePort.direction !== 'out') {
      throw new Error(`Source port "${sourcePort.id}" must have direction "out".`);
    }
    if (targetPort.direction !== 'in') {
      throw new Error(`Target port "${targetPort.id}" must have direction "in".`);
    }
    if (sourcePort.nodeId === targetPort.nodeId) {
      throw new Error('Self-loops are not allowed.');
    }

    // Tentatively add the edge, then check for cycles
    this.#state.edges.set(this.#edge.id, this.#edge);
    if (this.#state.hasCycle()) {
      this.#state.edges.delete(this.#edge.id);
      throw new Error('Adding this edge would create a cycle.');
    }

    this.#state.dispatchEvent(
      new CustomEvent('edge-added', { detail: { edge: this.#edge, edgeId: this.#edge.id } }),
    );
  }

  undo() {
    this.#state.edges.delete(this.#edge.id);
    this.#state.dispatchEvent(
      new CustomEvent('edge-removed', { detail: { edge: this.#edge, edgeId: this.#edge.id } }),
    );
  }
}

class RemoveEdgeCommand {
  #state;
  #edgeId;
  #edge;

  constructor(canvasState, edgeId) {
    this.#state = canvasState;
    this.#edgeId = edgeId;
  }

  execute() {
    this.#edge = this.#state.edges.get(this.#edgeId);
    if (!this.#edge) {
      throw new Error(`Edge "${this.#edgeId}" not found.`);
    }
    this.#state.edges.delete(this.#edgeId);
    this.#state.dispatchEvent(
      new CustomEvent('edge-removed', { detail: { edge: this.#edge, edgeId: this.#edgeId } }),
    );
  }

  undo() {
    this.#state.edges.set(this.#edgeId, this.#edge);
    this.#state.dispatchEvent(
      new CustomEvent('edge-added', { detail: { edge: this.#edge, edgeId: this.#edgeId } }),
    );
  }
}

class BatchCommand {
  #commands;

  constructor(commands) {
    this.#commands = commands;
  }

  execute() {
    for (const cmd of this.#commands) {
      cmd.execute();
    }
  }

  undo() {
    for (let i = this.#commands.length - 1; i >= 0; i--) {
      this.#commands[i].undo();
    }
  }
}

// ─── CanvasState ─────────────────────────────────────────────────────────────

export class CanvasState extends EventTarget {
  #nodes = new Map();
  #edges = new Map();
  #viewport = { panX: 0, panY: 0, zoom: 1 };
  #selectedNodeIds = new Set();
  #commandHistory = new CommandHistory();

  get nodes() { return this.#nodes; }
  get edges() { return this.#edges; }
  get viewport() { return this.#viewport; }
  get selectedNodeIds() { return this.#selectedNodeIds; }
  get commandHistory() { return this.#commandHistory; }

  // ─── Node mutations (via commands) ───────────────────────────────────────

  addNode(node) {
    this.#commandHistory.execute(new AddNodeCommand(this, node));
  }

  removeNode(nodeId) {
    this.#commandHistory.execute(new RemoveNodeCommand(this, nodeId));
  }

  setNodePosition(nodeId, x, y) {
    this.#commandHistory.execute(new MoveNodeCommand(this, nodeId, x, y));
  }

  setNodePositions(positionMap) {
    const commands = [];
    for (const [nodeId, { x, y }] of positionMap) {
      commands.push(new MoveNodeCommand(this, nodeId, x, y));
    }
    if (commands.length === 1) {
      this.#commandHistory.execute(commands[0]);
    } else if (commands.length > 1) {
      this.#commandHistory.execute(new BatchCommand(commands));
    }
  }

  // ─── Edge mutations (via commands) ───────────────────────────────────────

  addEdge(edge) {
    this.#commandHistory.execute(new AddEdgeCommand(this, edge));
  }

  removeEdge(edgeId) {
    this.#commandHistory.execute(new RemoveEdgeCommand(this, edgeId));
  }

  // ─── Direct node position (non-undoable, for live drag preview) ────────

  moveNodeDirect(nodeId, x, y) {
    const node = this.#nodes.get(nodeId);
    if (!node) return;
    node.x = x;
    node.y = y;
    this.dispatchEvent(
      new CustomEvent('node-moved', { detail: { nodeId, x, y } }),
    );
  }

  // ─── Viewport (non-undoable) ─────────────────────────────────────────────

  setViewport(panX, panY, zoom) {
    this.#viewport = { panX, panY, zoom };
    this.dispatchEvent(
      new CustomEvent('viewport-changed', { detail: { panX, panY, zoom } }),
    );
  }

  // ─── Selection (non-undoable) ────────────────────────────────────────────

  selectNode(nodeId) {
    this.#selectedNodeIds.clear();
    this.#selectedNodeIds.add(nodeId);
    this.#dispatchSelectionChanged();
  }

  toggleNodeSelection(nodeId) {
    if (this.#selectedNodeIds.has(nodeId)) {
      this.#selectedNodeIds.delete(nodeId);
    } else {
      this.#selectedNodeIds.add(nodeId);
    }
    this.#dispatchSelectionChanged();
  }

  clearSelection() {
    this.#selectedNodeIds.clear();
    this.#dispatchSelectionChanged();
  }

  selectNodes(nodeIds) {
    this.#selectedNodeIds.clear();
    for (const id of nodeIds) {
      this.#selectedNodeIds.add(id);
    }
    this.#dispatchSelectionChanged();
  }

  #dispatchSelectionChanged() {
    this.dispatchEvent(
      new CustomEvent('selection-changed', {
        detail: { selectedIds: new Set(this.#selectedNodeIds) },
      }),
    );
  }

  // ─── Port lookup helper ──────────────────────────────────────────────────

  _findPort(portId) {
    for (const node of this.#nodes.values()) {
      const port = node.ports.get(portId);
      if (port) return port;
    }
    return null;
  }

  // ─── Cycle detection (DFS) ───────────────────────────────────────────────

  hasCycle() {
    // Build adjacency list: nodeId → Set<nodeId>
    const adj = new Map();
    for (const node of this.#nodes.values()) {
      adj.set(node.id, new Set());
    }
    for (const edge of this.#edges.values()) {
      const sourcePort = this._findPort(edge.sourcePortId);
      const targetPort = this._findPort(edge.targetPortId);
      if (sourcePort && targetPort) {
        adj.get(sourcePort.nodeId).add(targetPort.nodeId);
      }
    }

    // DFS with three-color marking: 0=white, 1=gray, 2=black
    const color = new Map();
    for (const nodeId of adj.keys()) {
      color.set(nodeId, 0);
    }

    const dfs = (nodeId) => {
      color.set(nodeId, 1);
      const neighbors = adj.get(nodeId);
      if (neighbors) {
        for (const neighbor of neighbors) {
          if (color.get(neighbor) === 1) return true; // back edge → cycle
          if (color.get(neighbor) === 0 && dfs(neighbor)) return true;
        }
      }
      color.set(nodeId, 2);
      return false;
    };

    for (const nodeId of adj.keys()) {
      if (color.get(nodeId) === 0 && dfs(nodeId)) return true;
    }
    return false;
  }

  // ─── Serialization ──────────────────────────────────────────────────────

  toJSON() {
    return {
      nodes: Array.from(this.#nodes.values(), (n) => n.toJSON()),
      edges: Array.from(this.#edges.values(), (e) => e.toJSON()),
      viewport: { ...this.#viewport },
    };
  }

  static fromJSON(json) {
    const state = new CanvasState();
    for (const nodeData of json.nodes) {
      const { ports: portsData, ...rest } = nodeData;
      const node = new Node(rest);
      for (const portData of portsData) {
        node.addPort(new Port(portData));
      }
      state.#nodes.set(node.id, node);
    }
    for (const edgeData of json.edges) {
      state.#edges.set(edgeData.id, new Edge(edgeData));
    }
    if (json.viewport) {
      state.#viewport = { ...json.viewport };
    }
    return state;
  }
}
