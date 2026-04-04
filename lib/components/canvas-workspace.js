import './canvas-node.js';
import './canvas-edge-layer.js';

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: block;
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 100%;
  }
  :host(:focus-visible) {
    outline: 2px solid var(--vc-focus-ring-color, #4dabf7);
    outline-offset: 2px;
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
  <slot></slot>
</div>
`;

export class CanvasWorkspace extends HTMLElement {
  #state = null;
  #viewportEl;
  #edgeLayer = null;
  #nodeEls = new Map(); // nodeId → <canvas-node>
  #onViewportChanged;
  #onNodeAdded;
  #onNodeRemoved;
  #onStateReset;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.#viewportEl = this.shadowRoot.querySelector('.viewport');

    this.#onViewportChanged = (e) => {
      const { panX, panY, zoom } = e.detail;
      this.#viewportEl.style.setProperty('--pan-x', `${panX}px`);
      this.#viewportEl.style.setProperty('--pan-y', `${panY}px`);
      this.#viewportEl.style.setProperty('--zoom', zoom);
    };

    this.#onNodeAdded = (e) => {
      const node = e.detail.node;
      this.#createNodeElement(node);
    };

    this.#onNodeRemoved = (e) => {
      const nodeId = e.detail.nodeId;
      const el = this.#nodeEls.get(nodeId);
      if (el) {
        el.remove();
        this.#nodeEls.delete(nodeId);
      }
    };

    this.#onStateReset = () => {
      this.#rebuild();
    };
  }

  connectedCallback() {
    this.setAttribute('role', 'application');
    this.setAttribute('aria-label', 'Pipeline canvas');
    this.setAttribute('aria-roledescription', 'canvas');
  }

  disconnectedCallback() {
    if (this.#state) {
      this.#state.removeEventListener('viewport-changed', this.#onViewportChanged);
      this.#state.removeEventListener('node-added', this.#onNodeAdded);
      this.#state.removeEventListener('node-removed', this.#onNodeRemoved);
      this.#state.removeEventListener('state-reset', this.#onStateReset);
    }
  }

  get state() {
    return this.#state;
  }

  set state(canvasState) {
    if (this.#state) {
      this.#state.removeEventListener('viewport-changed', this.#onViewportChanged);
      this.#state.removeEventListener('node-added', this.#onNodeAdded);
      this.#state.removeEventListener('node-removed', this.#onNodeRemoved);
      this.#state.removeEventListener('state-reset', this.#onStateReset);
    }

    // Clear existing nodes
    for (const el of this.#nodeEls.values()) {
      el.remove();
    }
    this.#nodeEls.clear();
    if (this.#edgeLayer) {
      this.#edgeLayer.remove();
      this.#edgeLayer = null;
    }

    this.#state = canvasState;
    if (this.#state) {
      this.#state.addEventListener('viewport-changed', this.#onViewportChanged);
      this.#state.addEventListener('node-added', this.#onNodeAdded);
      this.#state.addEventListener('node-removed', this.#onNodeRemoved);
      this.#state.addEventListener('state-reset', this.#onStateReset);

      // Apply current viewport
      const { panX, panY, zoom } = this.#state.viewport;
      this.#viewportEl.style.setProperty('--pan-x', `${panX}px`);
      this.#viewportEl.style.setProperty('--pan-y', `${panY}px`);
      this.#viewportEl.style.setProperty('--zoom', zoom);

      // Create edge layer
      this.#edgeLayer = document.createElement('canvas-edge-layer');
      this.#edgeLayer.state = this.#state;
      this.#viewportEl.appendChild(this.#edgeLayer);

      // Create node elements for existing nodes
      for (const node of this.#state.nodes.values()) {
        this.#createNodeElement(node);
      }
    }
  }

  #rebuild() {
    for (const el of this.#nodeEls.values()) el.remove();
    this.#nodeEls.clear();
    if (this.#edgeLayer) this.#edgeLayer.remove();

    this.#edgeLayer = document.createElement('canvas-edge-layer');
    this.#edgeLayer.state = this.#state;
    this.#viewportEl.appendChild(this.#edgeLayer);

    for (const node of this.#state.nodes.values()) {
      this.#createNodeElement(node);
    }

    const { panX, panY, zoom } = this.#state.viewport;
    this.#viewportEl.style.setProperty('--pan-x', `${panX}px`);
    this.#viewportEl.style.setProperty('--pan-y', `${panY}px`);
    this.#viewportEl.style.setProperty('--zoom', zoom);
  }

  #createNodeElement(node) {
    const el = document.createElement('canvas-node');
    el.nodeId = node.id;
    el.nodeType = node.type;
    el.label = node.type;
    el.setPosition(node.x, node.y);
    el.state = this.#state;

    // Set ports from the node's port map
    const portArray = Array.from(node.ports.values());
    el.ports = portArray;

    this.#viewportEl.appendChild(el);
    this.#nodeEls.set(node.id, el);
  }
}

customElements.define('canvas-workspace', CanvasWorkspace);
