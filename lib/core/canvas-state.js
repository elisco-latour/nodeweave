import { CommandHistory } from "./command-history.js";
import { Node, Port, Edge } from "./graph.js";

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
      new CustomEvent("node-added", {
        detail: { node: this.#node, nodeId: this.#node.id },
      }),
    );
  }

  undo() {
    this.#state.nodes.delete(this.#node.id);
    this.#state.dispatchEvent(
      new CustomEvent("node-removed", {
        detail: { node: this.#node, nodeId: this.#node.id },
      }),
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
          new CustomEvent("edge-removed", { detail: { edge, edgeId } }),
        );
      }
    }

    this.#state.nodes.delete(this.#nodeId);
    this.#state.dispatchEvent(
      new CustomEvent("node-removed", {
        detail: { node: this.#node, nodeId: this.#nodeId },
      }),
    );
  }

  undo() {
    this.#state.nodes.set(this.#nodeId, this.#node);
    this.#state.dispatchEvent(
      new CustomEvent("node-added", {
        detail: { node: this.#node, nodeId: this.#nodeId },
      }),
    );

    for (const edge of this.#removedEdges) {
      this.#state.edges.set(edge.id, edge);
      this.#state.dispatchEvent(
        new CustomEvent("edge-added", { detail: { edge, edgeId: edge.id } }),
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
      new CustomEvent("node-moved", {
        detail: { nodeId: this.#nodeId, x: this.#newX, y: this.#newY },
      }),
    );
  }

  undo() {
    const node = this.#state.nodes.get(this.#nodeId);
    node.x = this.#oldX;
    node.y = this.#oldY;
    this.#state.dispatchEvent(
      new CustomEvent("node-moved", {
        detail: { nodeId: this.#nodeId, x: this.#oldX, y: this.#oldY },
      }),
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
    if (sourcePort.direction !== "out") {
      throw new Error(
        `Source port "${sourcePort.id}" must have direction "out".`,
      );
    }
    if (targetPort.direction !== "in") {
      throw new Error(
        `Target port "${targetPort.id}" must have direction "in".`,
      );
    }
    if (sourcePort.nodeId === targetPort.nodeId) {
      throw new Error("Self-loops are not allowed.");
    }

    // Tentatively add the edge, then check for cycles
    this.#state.edges.set(this.#edge.id, this.#edge);
    if (this.#state.hasCycle()) {
      this.#state.edges.delete(this.#edge.id);
      throw new Error("Adding this edge would create a cycle.");
    }

    this.#state.dispatchEvent(
      new CustomEvent("edge-added", {
        detail: { edge: this.#edge, edgeId: this.#edge.id },
      }),
    );
  }

  undo() {
    this.#state.edges.delete(this.#edge.id);
    this.#state.dispatchEvent(
      new CustomEvent("edge-removed", {
        detail: { edge: this.#edge, edgeId: this.#edge.id },
      }),
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
      new CustomEvent("edge-removed", {
        detail: { edge: this.#edge, edgeId: this.#edgeId },
      }),
    );
  }

  undo() {
    this.#state.edges.set(this.#edgeId, this.#edge);
    this.#state.dispatchEvent(
      new CustomEvent("edge-added", {
        detail: { edge: this.#edge, edgeId: this.#edgeId },
      }),
    );
  }
}

class UpdateNodeConfigCommand {
  #state;
  #nodeId;
  #newConfig;
  #oldConfig;

  constructor(canvasState, nodeId, newConfig) {
    this.#state = canvasState;
    this.#nodeId = nodeId;
    this.#newConfig = { ...newConfig };
    const node = canvasState.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node "${nodeId}" not found.`);
    }
    this.#oldConfig = { ...node.metadata.config };
  }

  execute() {
    const node = this.#state.nodes.get(this.#nodeId);
    node.metadata.config = { ...this.#newConfig };
    this.#state.dispatchEvent(
      new CustomEvent("node-config-updated", {
        detail: { nodeId: this.#nodeId, config: node.metadata.config },
      }),
    );
  }

  undo() {
    const node = this.#state.nodes.get(this.#nodeId);
    node.metadata.config = { ...this.#oldConfig };
    this.#state.dispatchEvent(
      new CustomEvent("node-config-updated", {
        detail: { nodeId: this.#nodeId, config: node.metadata.config },
      }),
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

class PasteCommand {
  #state;
  #nodes;
  #edges;
  #addedNodeIds = [];
  #addedEdgeIds = [];

  constructor(canvasState, nodes, edges) {
    this.#state = canvasState;
    this.#nodes = nodes;
    this.#edges = edges;
  }

  execute() {
    this.#addedNodeIds = [];
    this.#addedEdgeIds = [];
    for (const node of this.#nodes) {
      this.#state.nodes.set(node.id, node);
      this.#addedNodeIds.push(node.id);
      this.#state.dispatchEvent(
        new CustomEvent("node-added", {
          detail: { node, nodeId: node.id },
        }),
      );
    }
    for (const edge of this.#edges) {
      this.#state.edges.set(edge.id, edge);
      this.#addedEdgeIds.push(edge.id);
      this.#state.dispatchEvent(
        new CustomEvent("edge-added", {
          detail: { edge, edgeId: edge.id },
        }),
      );
    }
  }

  undo() {
    for (const edgeId of this.#addedEdgeIds) {
      const edge = this.#state.edges.get(edgeId);
      this.#state.edges.delete(edgeId);
      if (edge) {
        this.#state.dispatchEvent(
          new CustomEvent("edge-removed", {
            detail: { edge, edgeId },
          }),
        );
      }
    }
    for (const nodeId of this.#addedNodeIds) {
      const node = this.#state.nodes.get(nodeId);
      this.#state.nodes.delete(nodeId);
      if (node) {
        this.#state.dispatchEvent(
          new CustomEvent("node-removed", {
            detail: { node, nodeId },
          }),
        );
      }
    }
  }
}

// ─── CanvasState ─────────────────────────────────────────────────────────────

/**
 * @typedef {{ panX: number, panY: number, zoom: number }} Viewport
 */

/**
 * @typedef {{ nodes: Array<ReturnType<Node['toJSON']>>, edges: Array<ReturnType<Edge['toJSON']>>, viewport: Viewport }} CanvasStateJSON
 */

/**
 * @typedef {{ nodes: Array<*>, edges: Array<*> }} ClipboardData
 */

export class CanvasState extends EventTarget {
  /** @type {Map<string, Node>} */ #nodes = new Map();
  /** @type {Map<string, Edge>} */ #edges = new Map();
  /** @type {Viewport} */ #viewport = { panX: 0, panY: 0, zoom: 1 };
  /** @type {Set<string>} */ #selectedNodeIds = new Set();
  /** @type {CommandHistory} */ #commandHistory = new CommandHistory();
  /** @type {ClipboardData | null} */ #clipboard = null;
  /** @type {number} */ #pasteCounter = 0;

  /** @returns {Map<string, Node>} */
  get nodes() {
    return this.#nodes;
  }
  /** @returns {Map<string, Edge>} */
  get edges() {
    return this.#edges;
  }
  /** @returns {Viewport} */
  get viewport() {
    return this.#viewport;
  }
  /** @returns {Set<string>} */
  get selectedNodeIds() {
    return this.#selectedNodeIds;
  }
  /** @returns {CommandHistory} */
  get commandHistory() {
    return this.#commandHistory;
  }

  // ─── Node mutations (via commands) ───────────────────────────────────────

  /** @param {Node} node */
  addNode(node) {
    this.#commandHistory.execute(new AddNodeCommand(this, node));
  }

  /** @param {string} nodeId */
  removeNode(nodeId) {
    this.#commandHistory.execute(new RemoveNodeCommand(this, nodeId));
  }

  /**
   * @param {string} nodeId
   * @param {number} x
   * @param {number} y
   */
  setNodePosition(nodeId, x, y) {
    this.#commandHistory.execute(new MoveNodeCommand(this, nodeId, x, y));
  }

  /** @param {Map<string, {x: number, y: number}>} positionMap */
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

  /** @param {Edge} edge */
  addEdge(edge) {
    this.#commandHistory.execute(new AddEdgeCommand(this, edge));
  }

  /** @param {string} edgeId */
  removeEdge(edgeId) {
    this.#commandHistory.execute(new RemoveEdgeCommand(this, edgeId));
  }

  // ─── Config mutations (via commands) ─────────────────────────────────────

  /**
   * @param {string} nodeId
   * @param {Record<string, *>} config
   */
  updateNodeConfig(nodeId, config) {
    this.#commandHistory.execute(
      new UpdateNodeConfigCommand(this, nodeId, config),
    );
  }

  // ─── Direct node position (non-undoable, for live drag preview) ────────

  /**
   * @param {string} nodeId
   * @param {number} x
   * @param {number} y
   */
  moveNodeDirect(nodeId, x, y) {
    const node = this.#nodes.get(nodeId);
    if (!node) return;
    node.x = x;
    node.y = y;
    this.dispatchEvent(
      new CustomEvent("node-moved", { detail: { nodeId, x, y } }),
    );
  }

  // ─── Viewport (non-undoable) ─────────────────────────────────────────────

  /**
   * @param {number} panX
   * @param {number} panY
   * @param {number} zoom
   */
  setViewport(panX, panY, zoom) {
    this.#viewport = { panX, panY, zoom };
    this.dispatchEvent(
      new CustomEvent("viewport-changed", { detail: { panX, panY, zoom } }),
    );
  }

  // ─── Selection (non-undoable) ────────────────────────────────────────────

  /** @param {string} nodeId */
  selectNode(nodeId) {
    this.#selectedNodeIds.clear();
    this.#selectedNodeIds.add(nodeId);
    this.#dispatchSelectionChanged();
  }

  /** @param {string} nodeId */
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

  /** @param {string[]} nodeIds */
  selectNodes(nodeIds) {
    this.#selectedNodeIds.clear();
    for (const id of nodeIds) {
      this.#selectedNodeIds.add(id);
    }
    this.#dispatchSelectionChanged();
  }

  #dispatchSelectionChanged() {
    this.dispatchEvent(
      new CustomEvent("selection-changed", {
        detail: { selectedIds: new Set(this.#selectedNodeIds) },
      }),
    );
  }

  // ─── Port lookup helper ──────────────────────────────────────────────────

  /**
   * @param {string} portId
   * @returns {Port | null}
   */
  getPort(portId) {
    return this._findPort(portId);
  }

  /**
   * @param {string} portId
   * @returns {Port | null}
   */
  _findPort(portId) {
    for (const node of this.#nodes.values()) {
      const port = node.ports.get(portId);
      if (port) return port;
    }
    return null;
  }

  // ─── Copy / Paste / Duplicate ────────────────────────────────────────────

  copySelection() {
    if (this.#selectedNodeIds.size === 0) return;

    const selectedIds = new Set(this.#selectedNodeIds);
    const nodeData = [];
    const selectedPortIds = new Set();

    for (const nodeId of selectedIds) {
      const node = this.#nodes.get(nodeId);
      if (node) {
        nodeData.push(node.toJSON());
        for (const portId of node.ports.keys()) {
          selectedPortIds.add(portId);
        }
      }
    }

    // Only copy edges where both source and target belong to selected nodes
    const edgeData = [];
    for (const edge of this.#edges.values()) {
      if (selectedPortIds.has(edge.sourcePortId) && selectedPortIds.has(edge.targetPortId)) {
        edgeData.push(edge.toJSON());
      }
    }

    this.#clipboard = { nodes: nodeData, edges: edgeData };
  }

  paste() {
    if (!this.#clipboard || this.#clipboard.nodes.length === 0) return;

    this.#pasteCounter++;
    const offset = 20 * this.#pasteCounter;
    const idMap = new Map(); // oldId → newId
    const portIdMap = new Map(); // oldPortId → newPortId

    // Create new nodes with new IDs
    const newNodes = [];
    for (const nodeData of this.#clipboard.nodes) {
      const newId = `${nodeData.id}-copy-${this.#pasteCounter}-${Date.now()}`;
      idMap.set(nodeData.id, newId);

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
          positionHint: portData.positionHint,
        }));
      }

      newNodes.push(newNode);
    }

    // Create new edges with remapped port IDs
    const newEdges = [];
    for (const edgeData of this.#clipboard.edges) {
      const newSourcePortId = portIdMap.get(edgeData.sourcePortId);
      const newTargetPortId = portIdMap.get(edgeData.targetPortId);
      if (newSourcePortId && newTargetPortId) {
        const newEdgeId = `${edgeData.id}-copy-${this.#pasteCounter}-${Date.now()}`;
        newEdges.push(new Edge({
          id: newEdgeId,
          sourcePortId: newSourcePortId,
          targetPortId: newTargetPortId,
        }));
      }
    }

    this.#commandHistory.execute(new PasteCommand(this, newNodes, newEdges));
  }

  duplicate() {
    this.copySelection();
    this.paste();
  }

  // ─── Cycle detection (DFS) ───────────────────────────────────────────────

  /** @returns {boolean} */
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

  /** @returns {CanvasStateJSON} */
  toJSON() {
    return {
      nodes: Array.from(this.#nodes.values(), (n) => n.toJSON()),
      edges: Array.from(this.#edges.values(), (e) => e.toJSON()),
      viewport: { ...this.#viewport },
    };
  }

  // ─── Document-level operations (non-undoable) ─────────────────────────

  clear() {
    this.#nodes.clear();
    this.#edges.clear();
    this.#selectedNodeIds.clear();
    this.#commandHistory.clear();
    this.#viewport = { panX: 0, panY: 0, zoom: 1 };
    this.dispatchEvent(new CustomEvent('state-reset'));
  }

  /** @param {CanvasStateJSON} json */
  loadFromJSON(json) {
    this.#nodes.clear();
    this.#edges.clear();
    this.#selectedNodeIds.clear();
    this.#commandHistory.clear();

    for (const nodeData of json.nodes) {
      const { ports: portsData, ...rest } = nodeData;
      const node = new Node(rest);
      for (const portData of portsData) {
        node.addPort(new Port(portData));
      }
      this.#nodes.set(node.id, node);
    }
    for (const edgeData of json.edges) {
      this.#edges.set(edgeData.id, new Edge(edgeData));
    }
    if (json.viewport) {
      this.#viewport = { ...json.viewport };
    }
    this.dispatchEvent(new CustomEvent('state-reset'));
  }

  /**
   * @param {CanvasStateJSON} json
   * @returns {CanvasState}
   */
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
