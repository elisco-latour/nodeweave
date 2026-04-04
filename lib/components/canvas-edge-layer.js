const HEADER_HEIGHT = 6;
const PORT_SPACING = 22;
const SVG_NS = 'http://www.w3.org/2000/svg';

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  svg {
    width: 100%;
    height: 100%;
  }
  path {
    fill: none;
    stroke: var(--vc-edge-color, #666);
    stroke-width: 2;
  }
  path:hover {
    stroke-width: 4;
    pointer-events: stroke;
  }
  path.phantom {
    stroke-dasharray: 6 4;
    stroke: var(--vc-edge-color-phantom, #999);
  }
</style>
<svg aria-hidden="true"></svg>
`;

export class CanvasEdgeLayer extends HTMLElement {
  #state = null;
  #svg;
  #pathMap = new Map(); // edgeId → <path>
  #visibleNodeIds = null; // null = show all

  #onEdgeAdded;
  #onEdgeRemoved;
  #onNodeMoved;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.#svg = this.shadowRoot.querySelector('svg');

    this.#onEdgeAdded = (e) => {
      this.#addEdgePath(e.detail.edge);
    };
    this.#onEdgeRemoved = (e) => {
      this.#removeEdgePath(e.detail.edgeId ?? e.detail.edge.id);
    };
    this.#onNodeMoved = (e) => {
      this.#updateEdgesForNode(e.detail.nodeId);
    };
  }

  disconnectedCallback() {
    if (this.#state) {
      this.#state.removeEventListener('edge-added', this.#onEdgeAdded);
      this.#state.removeEventListener('edge-removed', this.#onEdgeRemoved);
      this.#state.removeEventListener('node-moved', this.#onNodeMoved);
    }
  }

  get state() { return this.#state; }
  set state(canvasState) {
    if (this.#state) {
      this.#state.removeEventListener('edge-added', this.#onEdgeAdded);
      this.#state.removeEventListener('edge-removed', this.#onEdgeRemoved);
      this.#state.removeEventListener('node-moved', this.#onNodeMoved);
    }
    this.#state = canvasState;
    if (this.#state) {
      this.#state.addEventListener('edge-added', this.#onEdgeAdded);
      this.#state.addEventListener('edge-removed', this.#onEdgeRemoved);
      this.#state.addEventListener('node-moved', this.#onNodeMoved);
      this.#renderAllEdges();
    }
  }

  _getPortPosition(portId) {
    if (!this.#state) return null;
    const port = this.#state._findPort(portId);
    if (!port) return null;
    const node = this.#state.nodes.get(port.nodeId);
    if (!node) return null;

    // Determine port index among same-direction ports of this node
    const sameDirPorts = [];
    for (const p of node.ports.values()) {
      if (p.direction === port.direction) {
        sameDirPorts.push(p);
      }
    }
    const portIndex = sameDirPorts.indexOf(port);
    const portOffsetY = HEADER_HEIGHT + (portIndex * PORT_SPACING) + PORT_SPACING / 2 + 8; // +8 for label padding

    if (port.direction === 'out') {
      return { x: node.x + node.width, y: node.y + portOffsetY };
    }
    return { x: node.x, y: node.y + portOffsetY };
  }

  #buildBezierPath(source, target) {
    const dx = Math.abs(target.x - source.x);
    const offset = Math.min(dx * 0.5, 150);
    const cp1x = source.x + offset;
    const cp2x = target.x - offset;
    return `M ${source.x},${source.y} C ${cp1x},${source.y} ${cp2x},${target.y} ${target.x},${target.y}`;
  }

  #addEdgePath(edge) {
    const source = this._getPortPosition(edge.sourcePortId);
    const target = this._getPortPosition(edge.targetPortId);
    if (!source || !target) return;

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', this.#buildBezierPath(source, target));
    path.dataset.edgeId = edge.id;
    this.#svg.appendChild(path);
    this.#pathMap.set(edge.id, path);
  }

  #removeEdgePath(edgeId) {
    const path = this.#pathMap.get(edgeId);
    if (path) {
      path.remove();
      this.#pathMap.delete(edgeId);
    }
  }

  #updateEdgesForNode(nodeId) {
    const node = this.#state.nodes.get(nodeId);
    if (!node) return;
    const portIds = new Set(node.ports.keys());

    for (const [edgeId, edge] of this.#state.edges) {
      if (portIds.has(edge.sourcePortId) || portIds.has(edge.targetPortId)) {
        const path = this.#pathMap.get(edgeId);
        if (path) {
          const source = this._getPortPosition(edge.sourcePortId);
          const target = this._getPortPosition(edge.targetPortId);
          if (source && target) {
            path.setAttribute('d', this.#buildBezierPath(source, target));
          }
        }
      }
    }
  }

  #renderAllEdges() {
    // Clear existing paths
    for (const path of this.#pathMap.values()) {
      path.remove();
    }
    this.#pathMap.clear();

    // Render all edges
    for (const edge of this.#state.edges.values()) {
      this.#addEdgePath(edge);
    }
  }

  setVisibleNodes(visibleNodeIds) {
    this.#visibleNodeIds = visibleNodeIds;
    this.#updateEdgeVisibility();
  }

  #isEdgeVisible(edge) {
    if (!this.#visibleNodeIds) return true;
    const sourcePort = this.#state._findPort(edge.sourcePortId);
    const targetPort = this.#state._findPort(edge.targetPortId);
    if (!sourcePort || !targetPort) return false;
    return this.#visibleNodeIds.has(sourcePort.nodeId) || this.#visibleNodeIds.has(targetPort.nodeId);
  }

  #updateEdgeVisibility() {
    for (const [edgeId, path] of this.#pathMap) {
      const edge = this.#state.edges.get(edgeId);
      if (!edge) continue;
      const visible = this.#isEdgeVisible(edge);
      path.style.display = visible ? '' : 'none';
    }
  }
}

customElements.define('canvas-edge-layer', CanvasEdgeLayer);
