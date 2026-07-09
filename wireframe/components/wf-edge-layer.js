import { buildEdgePath, getEdgeCenter } from '../../dist/core/edge-paths.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Layout constants matching wf-node.js CSS
const WF_HEADER_HEIGHT = 45; // 10px pad + 24px icon + 10px pad + 1px border
const WF_BODY_PAD = 12;
const WF_ROW_HEIGHT = 24;
const WF_ROW_GAP = 8;
const WF_BEZIER_OPTS = { minBow: 100 };

/**
 * <wf-edge-layer> — SVG Bézier edge layer for the wireframe consumer.
 *
 * Minimal edge renderer that listens to CanvasState events.
 * Styled for the wireframe's light-theme aesthetic.
 */

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
    overflow: visible;
  }
  svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  /* Scope to direct children so marker paths inside <defs> keep their own fill/stroke */
  svg > path {
    fill: none;
    stroke: var(--wf-edge-color, #94a3b8);
    stroke-width: 2.5;
    transition: stroke 0.2s;
  }
  svg > path.phantom {
    stroke-dasharray: 8 4;
    opacity: 0.5;
  }
  .edge-label-bg {
    fill: var(--wf-bg-surface, #ffffff);
    stroke: var(--wf-border, #e2e8f0);
    stroke-width: 1;
  }
  .edge-label-text {
    fill: var(--wf-text, #0f172a);
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    font-size: 11px;
    pointer-events: none;
  }
</style>
<svg aria-hidden="true">
  <defs>
    <marker id="wf-arrowclosed" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
    </marker>
    <marker id="wf-arrow" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="7" markerHeight="7" orient="auto">
      <path d="M 1 1 L 9 5 L 1 9" fill="none" stroke="context-stroke" stroke-width="1.6" />
    </marker>
  </defs>
</svg>
`;

export class WfEdgeLayer extends HTMLElement {
  #state = null;
  #svg;
  #paths = new Map();
  #labels = new Map();
  #visibleNodes = null;

  #onEdgeAdded;
  #onEdgeRemoved;
  #onNodeMoved;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.#svg = this.shadowRoot.querySelector('svg');

    this.#onEdgeAdded = (e) => this.#addEdge(e.detail.edge);
    this.#onEdgeRemoved = (e) => this.#removeEdge(e.detail.edgeId);
    this.#onNodeMoved = () => this.#updateAll();
  }

  get state() { return this.#state; }
  set state(s) {
    if (this.#state) {
      this.#state.removeEventListener('edge-added', this.#onEdgeAdded);
      this.#state.removeEventListener('edge-removed', this.#onEdgeRemoved);
      this.#state.removeEventListener('node-moved', this.#onNodeMoved);
    }
    // Remove tracked edge paths and labels, but keep <defs> (markers)
    for (const p of this.#paths.values()) p.remove();
    this.#paths.clear();
    for (const g of this.#labels.values()) g.remove();
    this.#labels.clear();
    this.#visibleNodes = null;
    this.#state = s;
    if (!this.#state) return;

    this.#state.addEventListener('edge-added', this.#onEdgeAdded);
    this.#state.addEventListener('edge-removed', this.#onEdgeRemoved);
    this.#state.addEventListener('node-moved', this.#onNodeMoved);

    for (const edge of this.#state.edges.values()) {
      this.#addEdge(edge);
    }
  }

  setVisibleNodes(ids) {
    this.#visibleNodes = ids;
    this.#updateAll();
  }

  #isEdgeVisible(edge) {
    if (!this.#visibleNodes) return true;
    const srcPort = this.#state.getPort(edge.sourcePortId);
    const tgtPort = this.#state.getPort(edge.targetPortId);
    if (!srcPort || !tgtPort) return false;
    return this.#visibleNodes.has(srcPort.nodeId) || this.#visibleNodes.has(tgtPort.nodeId);
  }

  #addEdge(edge) {
    const path = document.createElementNS(SVG_NS, 'path');
    this.#svg.appendChild(path);
    this.#paths.set(edge.id, path);
    this.#applyMarker(path, edge);
    this.#updatePath(edge, path);
    if (!this.#isEdgeVisible(edge)) {
      path.style.display = 'none';
      const g = this.#labels.get(edge.id);
      if (g) g.style.display = 'none';
    }
  }

  #removeEdge(edgeId) {
    const path = this.#paths.get(edgeId);
    if (path) { path.remove(); this.#paths.delete(edgeId); }
    const g = this.#labels.get(edgeId);
    if (g) { g.remove(); this.#labels.delete(edgeId); }
  }

  #updateAll() {
    if (!this.#state) return;
    for (const edge of this.#state.edges.values()) {
      const path = this.#paths.get(edge.id);
      if (!path) continue;
      const g = this.#labels.get(edge.id);
      if (this.#isEdgeVisible(edge)) {
        path.style.display = '';
        if (g) g.style.display = '';
        this.#updatePath(edge, path);
      } else {
        path.style.display = 'none';
        if (g) g.style.display = 'none';
      }
    }
  }

  #applyMarker(path, edge) {
    if (edge.markerEnd === 'arrow') {
      path.setAttribute('marker-end', 'url(#wf-arrow)');
    } else if (edge.markerEnd === 'arrowclosed') {
      path.setAttribute('marker-end', 'url(#wf-arrowclosed)');
    } else {
      path.removeAttribute('marker-end');
    }
  }

  #updatePath(edge, path) {
    const src = this.#getPortCenter(edge.sourcePortId);
    const tgt = this.#getPortCenter(edge.targetPortId);
    if (!src || !tgt) return;

    path.setAttribute('d', buildEdgePath(edge.type ?? 'bezier', src, tgt, WF_BEZIER_OPTS));
    this.#syncLabel(edge, src, tgt);
  }

  #syncLabel(edge, source, target) {
    let g = this.#labels.get(edge.id);

    if (!edge.label) {
      if (g) { g.remove(); this.#labels.delete(edge.id); }
      return;
    }

    if (!g) {
      g = document.createElementNS(SVG_NS, 'g');
      g.classList.add('edge-label');
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.classList.add('edge-label-bg');
      rect.setAttribute('rx', '4');
      const text = document.createElementNS(SVG_NS, 'text');
      text.classList.add('edge-label-text');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      g.append(rect, text);
      this.#svg.appendChild(g);
      this.#labels.set(edge.id, g);
    }

    const text = g.querySelector('text');
    const rect = g.querySelector('rect');
    const mid = getEdgeCenter(source, target);
    if (text.textContent !== edge.label) text.textContent = edge.label;
    text.setAttribute('x', mid.x);
    text.setAttribute('y', mid.y);

    const padX = 6;
    const padY = 3;
    let w = 0;
    let h = 0;
    try { const bb = text.getBBox(); w = bb.width; h = bb.height; } catch { /* not laid out yet */ }
    if (!w) { w = String(edge.label).length * 6.4; h = 12; }
    rect.setAttribute('x', mid.x - w / 2 - padX);
    rect.setAttribute('y', mid.y - h / 2 - padY);
    rect.setAttribute('width', w + padX * 2);
    rect.setAttribute('height', h + padY * 2);
  }

  _getPortPosition(portId) {
    return this.#getPortCenter(portId);
  }

  #getPortCenter(portId) {
    if (!this.#state) return null;
    const port = this.#state.getPort(portId);
    if (!port) return null;
    const node = this.#state.nodes.get(port.nodeId);
    if (!node) return null;

    // Find this port's row index among same-direction siblings
    const sameDirPorts = [];
    for (const p of node.ports.values()) {
      if (p.direction === port.direction) sameDirPorts.push(p);
    }
    const rowIndex = sameDirPorts.indexOf(port);

    const x = port.direction === 'out' ? node.x + node.width : node.x;
    const y = node.y + WF_HEADER_HEIGHT + WF_BODY_PAD
            + rowIndex * (WF_ROW_HEIGHT + WF_ROW_GAP)
            + WF_ROW_HEIGHT / 2;
    return { x, y };
  }
}

customElements.define('wf-edge-layer', WfEdgeLayer);
