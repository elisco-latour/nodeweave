import { buildEdgePath, getEdgeCenter } from '../core/edge-paths.js';

const HEADER_HEIGHT = 6;
const PORT_SPACING = 22;
const SVG_NS = 'http://www.w3.org/2000/svg';
const BEZIER_OPTS = { maxBow: 150 };

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
  /* Scope to direct children so marker paths inside <defs> keep their own fill/stroke */
  svg > path {
    fill: none;
    stroke: var(--vc-edge-color, #666);
    stroke-width: 2;
  }
  svg > path:hover {
    stroke-width: 4;
    pointer-events: stroke;
  }
  svg > path.phantom {
    stroke-dasharray: 6 4;
    stroke: var(--vc-edge-color-phantom, #999);
  }
  .edge-label-bg {
    fill: var(--vc-edge-label-bg, #16213e);
    stroke: var(--vc-edge-label-border, #2a3a5e);
    stroke-width: 1;
  }
  .edge-label-text {
    fill: var(--vc-edge-label-color, #e0e0e0);
    font-family: var(--vc-font-family, system-ui, -apple-system, sans-serif);
    font-size: 11px;
    pointer-events: none;
  }
</style>
<svg aria-hidden="true">
  <defs>
    <marker id="vc-arrowclosed" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
    </marker>
    <marker id="vc-arrow" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="7" markerHeight="7" orient="auto">
      <path d="M 1 1 L 9 5 L 1 9" fill="none" stroke="context-stroke" stroke-width="1.6" />
    </marker>
  </defs>
</svg>
`;

export class CanvasEdgeLayer extends HTMLElement {
  #state = null;
  #svg;
  #pathMap = new Map(); // edgeId → <path>
  #labelMap = new Map(); // edgeId → <g> label group
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
    const port = this.#state.getPort(portId);
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

  #buildPath(edge, source, target) {
    return buildEdgePath(edge.type ?? 'bezier', source, target, BEZIER_OPTS);
  }

  #applyMarker(path, edge) {
    if (edge.markerEnd === 'arrow') {
      path.setAttribute('marker-end', 'url(#vc-arrow)');
    } else if (edge.markerEnd === 'arrowclosed') {
      path.setAttribute('marker-end', 'url(#vc-arrowclosed)');
    } else {
      path.removeAttribute('marker-end');
    }
  }

  #syncLabel(edge, source, target) {
    let g = this.#labelMap.get(edge.id);

    if (!edge.label) {
      if (g) { g.remove(); this.#labelMap.delete(edge.id); }
      return;
    }

    if (!g) {
      g = document.createElementNS(SVG_NS, 'g');
      g.classList.add('edge-label');
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.classList.add('edge-label-bg');
      rect.setAttribute('rx', '3');
      const text = document.createElementNS(SVG_NS, 'text');
      text.classList.add('edge-label-text');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      g.append(rect, text);
      this.#svg.appendChild(g);
      this.#labelMap.set(edge.id, g);
    }

    const text = g.querySelector('text');
    const rect = g.querySelector('rect');
    const mid = getEdgeCenter(source, target);
    if (text.textContent !== edge.label) text.textContent = edge.label;
    text.setAttribute('x', mid.x);
    text.setAttribute('y', mid.y);

    // Size the background pill around the text
    const padX = 5;
    const padY = 3;
    let w = 0;
    let h = 0;
    try { const bb = text.getBBox(); w = bb.width; h = bb.height; } catch { /* not laid out yet */ }
    if (!w) { w = String(edge.label).length * 6.2; h = 12; }
    rect.setAttribute('x', mid.x - w / 2 - padX);
    rect.setAttribute('y', mid.y - h / 2 - padY);
    rect.setAttribute('width', w + padX * 2);
    rect.setAttribute('height', h + padY * 2);
  }

  #addEdgePath(edge) {
    const source = this._getPortPosition(edge.sourcePortId);
    const target = this._getPortPosition(edge.targetPortId);
    if (!source || !target) return;

    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', this.#buildPath(edge, source, target));
    path.dataset.edgeId = edge.id;
    this.#applyMarker(path, edge);
    this.#svg.appendChild(path);
    this.#pathMap.set(edge.id, path);
    this.#syncLabel(edge, source, target);
  }

  #removeEdgePath(edgeId) {
    const path = this.#pathMap.get(edgeId);
    if (path) {
      path.remove();
      this.#pathMap.delete(edgeId);
    }
    const label = this.#labelMap.get(edgeId);
    if (label) {
      label.remove();
      this.#labelMap.delete(edgeId);
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
            path.setAttribute('d', this.#buildPath(edge, source, target));
            this.#syncLabel(edge, source, target);
          }
        }
      }
    }
  }

  #renderAllEdges() {
    // Clear existing paths and labels
    for (const path of this.#pathMap.values()) {
      path.remove();
    }
    this.#pathMap.clear();
    for (const label of this.#labelMap.values()) {
      label.remove();
    }
    this.#labelMap.clear();

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
    const sourcePort = this.#state.getPort(edge.sourcePortId);
    const targetPort = this.#state.getPort(edge.targetPortId);
    if (!sourcePort || !targetPort) return false;
    return this.#visibleNodeIds.has(sourcePort.nodeId) || this.#visibleNodeIds.has(targetPort.nodeId);
  }

  #updateEdgeVisibility() {
    for (const [edgeId, path] of this.#pathMap) {
      const edge = this.#state.edges.get(edgeId);
      if (!edge) continue;
      const visible = this.#isEdgeVisible(edge);
      path.style.display = visible ? '' : 'none';
      const label = this.#labelMap.get(edgeId);
      if (label) label.style.display = visible ? '' : 'none';
    }
  }
}

customElements.define('canvas-edge-layer', CanvasEdgeLayer);
