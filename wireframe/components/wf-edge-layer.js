// Layout constants matching wf-node.js CSS
const WF_HEADER_HEIGHT = 45; // 10px pad + 24px icon + 10px pad + 1px border
const WF_BODY_PAD = 12;
const WF_ROW_HEIGHT = 24;
const WF_ROW_GAP = 8;

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
  path {
    fill: none;
    stroke: var(--wf-edge-color, #94a3b8);
    stroke-width: 2.5;
    transition: stroke 0.2s;
  }
  path.phantom {
    stroke-dasharray: 8 4;
    opacity: 0.5;
  }
</style>
<svg aria-hidden="true"></svg>
`;

export class WfEdgeLayer extends HTMLElement {
  #state = null;
  #svg;
  #paths = new Map();
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
    this.#svg.innerHTML = '';
    this.#paths.clear();
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
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.#svg.appendChild(path);
    this.#paths.set(edge.id, path);
    this.#updatePath(edge, path);
    if (!this.#isEdgeVisible(edge)) {
      path.style.display = 'none';
    }
  }

  #removeEdge(edgeId) {
    const path = this.#paths.get(edgeId);
    if (path) { path.remove(); this.#paths.delete(edgeId); }
  }

  #updateAll() {
    if (!this.#state) return;
    for (const edge of this.#state.edges.values()) {
      const path = this.#paths.get(edge.id);
      if (!path) continue;
      if (this.#isEdgeVisible(edge)) {
        path.style.display = '';
        this.#updatePath(edge, path);
      } else {
        path.style.display = 'none';
      }
    }
  }

  #updatePath(edge, path) {
    const src = this.#getPortCenter(edge.sourcePortId);
    const tgt = this.#getPortCenter(edge.targetPortId);
    if (!src || !tgt) return;

    const dx = Math.max(100, Math.abs(tgt.x - src.x) * 0.5);
    const d = `M ${src.x} ${src.y} C ${src.x + dx} ${src.y}, ${tgt.x - dx} ${tgt.y}, ${tgt.x} ${tgt.y}`;
    path.setAttribute('d', d);
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
