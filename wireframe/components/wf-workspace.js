/**
 * <wf-workspace> — Wireframe-style infinite canvas with dot grid.
 *
 * Consumes CanvasState from lib/core.js, renders <wf-node> children,
 * and hosts an SVG edge layer. Does NOT import lib/components/.
 */
import './wf-node.js';
import './wf-edge-layer.js';

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: block;
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 100%;
    background-color: #f8fafc;
    background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
    background-size: 24px 24px;
    cursor: grab;
  }
  :host(:active) { cursor: grabbing; }
  :host(:focus-visible) {
    outline: 2px solid #3b82f6;
    outline-offset: -2px;
  }
  .viewport {
    transform-origin: 0 0;
    transform: translate(var(--pan-x, 0px), var(--pan-y, 0px)) scale(var(--zoom, 1));
    width: 100%;
    height: 100%;
    position: relative;
  }
</style>
<div class="viewport">
  <wf-edge-layer></wf-edge-layer>
  <slot></slot>
</div>
`;

export class WfWorkspace extends HTMLElement {
  #state = null;
  #viewportEl;
  #edgeLayer;
  #nodeEls = new Map();
  #visualRegistry = null;
  #topologyRegistry = null;

  #onViewportChanged;
  #onNodeAdded;
  #onNodeRemoved;
  #onNodeMoved;
  #onStateReset;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.#viewportEl = this.shadowRoot.querySelector('.viewport');
    this.#edgeLayer = this.shadowRoot.querySelector('wf-edge-layer');

    this.#onViewportChanged = (e) => {
      const { panX, panY, zoom } = e.detail;
      this.#viewportEl.style.setProperty('--pan-x', `${panX}px`);
      this.#viewportEl.style.setProperty('--pan-y', `${panY}px`);
      this.#viewportEl.style.setProperty('--zoom', zoom);
    };

    this.#onNodeAdded = (e) => {
      this.#createNodeElement(e.detail.node);
    };

    this.#onNodeRemoved = (e) => {
      const el = this.#nodeEls.get(e.detail.nodeId);
      if (el) { el.remove(); this.#nodeEls.delete(e.detail.nodeId); }
    };

    this.#onNodeMoved = (e) => {
      const el = this.#nodeEls.get(e.detail.nodeId);
      if (el) el.setPosition(e.detail.x, e.detail.y);
    };

    this.#onStateReset = () => {
      this.#clear();
      if (!this.#state) return;

      const { panX, panY, zoom } = this.#state.viewport;
      this.#viewportEl.style.setProperty('--pan-x', `${panX}px`);
      this.#viewportEl.style.setProperty('--pan-y', `${panY}px`);
      this.#viewportEl.style.setProperty('--zoom', zoom);

      for (const node of this.#state.nodes.values()) {
        this.#createNodeElement(node);
      }

      // Re-sync edge layer
      this.#edgeLayer.state = this.#state;
    };
  }

  connectedCallback() {
    this.setAttribute('role', 'application');
    this.setAttribute('aria-label', 'Pipeline canvas');
    this.setAttribute('tabindex', '0');
  }

  disconnectedCallback() {
    this.#detachState();
  }

  set visualRegistry(reg) { this.#visualRegistry = reg; }
  set topologyRegistry(reg) { this.#topologyRegistry = reg; }

  get state() { return this.#state; }
  set state(canvasState) {
    this.#detachState();
    this.#clear();
    this.#state = canvasState;
    if (!this.#state) return;

    this.#state.addEventListener('viewport-changed', this.#onViewportChanged);
    this.#state.addEventListener('node-added', this.#onNodeAdded);
    this.#state.addEventListener('node-removed', this.#onNodeRemoved);
    this.#state.addEventListener('node-moved', this.#onNodeMoved);
    this.#state.addEventListener('state-reset', this.#onStateReset);

    this.#edgeLayer.state = this.#state;

    const { panX, panY, zoom } = this.#state.viewport;
    this.#viewportEl.style.setProperty('--pan-x', `${panX}px`);
    this.#viewportEl.style.setProperty('--pan-y', `${panY}px`);
    this.#viewportEl.style.setProperty('--zoom', zoom);

    for (const node of this.#state.nodes.values()) {
      this.#createNodeElement(node);
    }
  }

  #detachState() {
    if (!this.#state) return;
    this.#state.removeEventListener('viewport-changed', this.#onViewportChanged);
    this.#state.removeEventListener('node-added', this.#onNodeAdded);
    this.#state.removeEventListener('node-removed', this.#onNodeRemoved);
    this.#state.removeEventListener('node-moved', this.#onNodeMoved);
    this.#state.removeEventListener('state-reset', this.#onStateReset);
  }

  #clear() {
    for (const el of this.#nodeEls.values()) el.remove();
    this.#nodeEls.clear();
  }

  #createNodeElement(node) {
    const el = document.createElement('wf-node');
    el.nodeId = node.id;
    el.nodeType = node.type;
    el.setPosition(node.x, node.y);
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'listitem');

    if (this.#visualRegistry && this.#visualRegistry.has(node.type)) {
      el.visualDef = this.#visualRegistry.get(node.type);
    }

    // Build port definitions with topology metadata
    const portArray = [];
    for (const port of node.ports.values()) {
      const def = { id: port.id, direction: port.direction, label: port.id, dataType: 'any' };

      // Overlay topology info (label, dataType) if available
      if (this.#topologyRegistry && this.#topologyRegistry.has(node.type)) {
        const topo = this.#topologyRegistry.get(node.type);
        const list = port.direction === 'in' ? topo.inputs : topo.outputs;
        const portSuffix = port.id.split(':').pop();
        const match = list.find(p => p.id === portSuffix);
        if (match) {
          def.label = match.label;
          def.dataType = match.dataType || 'any';
        }
      }
      portArray.push(def);
    }
    el.ports = portArray;

    this.#viewportEl.appendChild(el);
    this.#nodeEls.set(node.id, el);
  }
}

customElements.define('wf-workspace', WfWorkspace);
