import './canvas-node.js';
import './canvas-edge-layer.js';
import { ViewportCulling } from '../core/viewport-culling.js';
import type { CanvasNode } from './canvas-node.js';
import type { CanvasEdgeLayer } from './canvas-edge-layer.js';
import type { CanvasState } from '../core/canvas-state.js';
import type { Node } from '../core/graph.js';

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
  readonly #root: ShadowRoot;
  #state: CanvasState | null = null;
  readonly #viewportEl: HTMLElement;
  #edgeLayer: CanvasEdgeLayer | null = null;
  readonly #nodeEls: Map<string, CanvasNode> = new Map(); // nodeId → <canvas-node>
  #visibleNodeIds: Set<string> = new Set();

  readonly #onViewportChanged: (e: Event) => void;
  readonly #onNodeAdded: (e: Event) => void;
  readonly #onNodeRemoved: (e: Event) => void;
  readonly #onNodeMoved: (e: Event) => void;
  readonly #onStateReset: (e: Event) => void;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
    this.#root.appendChild(template.content.cloneNode(true));
    this.#viewportEl = this.#root.querySelector('.viewport')!;

    this.#onViewportChanged = (e: Event) => {
      const { panX, panY, zoom } = (e as CustomEvent).detail;
      this.#viewportEl.style.setProperty('--pan-x', `${panX}px`);
      this.#viewportEl.style.setProperty('--pan-y', `${panY}px`);
      this.#viewportEl.style.setProperty('--zoom', String(zoom));
      this.#updateCulling();
    };

    this.#onNodeAdded = (e: Event) => {
      this.#createNodeElement((e as CustomEvent).detail.node);
      this.#updateCulling();
    };

    this.#onNodeRemoved = (e: Event) => {
      const nodeId = (e as CustomEvent).detail.nodeId;
      const el = this.#nodeEls.get(nodeId);
      if (el) {
        el.remove();
        this.#nodeEls.delete(nodeId);
      }
      this.#visibleNodeIds.delete(nodeId);
      this.#updateCulling();
    };

    this.#onNodeMoved = () => {
      this.#updateCulling();
    };

    this.#onStateReset = () => {
      this.#rebuild();
    };
  }

  connectedCallback(): void {
    this.setAttribute('role', 'application');
    this.setAttribute('aria-label', 'Pipeline canvas');
    this.setAttribute('aria-roledescription', 'canvas');
  }

  disconnectedCallback(): void {
    if (this.#state) {
      this.#state.removeEventListener('viewport-changed', this.#onViewportChanged);
      this.#state.removeEventListener('node-added', this.#onNodeAdded);
      this.#state.removeEventListener('node-removed', this.#onNodeRemoved);
      this.#state.removeEventListener('node-moved', this.#onNodeMoved);
      this.#state.removeEventListener('state-reset', this.#onStateReset);
    }
  }

  get state(): CanvasState | null { return this.#state; }
  set state(canvasState: CanvasState | null) {
    if (this.#state) {
      this.#state.removeEventListener('viewport-changed', this.#onViewportChanged);
      this.#state.removeEventListener('node-added', this.#onNodeAdded);
      this.#state.removeEventListener('node-removed', this.#onNodeRemoved);
      this.#state.removeEventListener('node-moved', this.#onNodeMoved);
      this.#state.removeEventListener('state-reset', this.#onStateReset);
    }

    // Clear existing nodes
    for (const el of this.#nodeEls.values()) el.remove();
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
      this.#state.addEventListener('node-moved', this.#onNodeMoved);
      this.#state.addEventListener('state-reset', this.#onStateReset);

      const { panX, panY, zoom } = this.#state.viewport;
      this.#viewportEl.style.setProperty('--pan-x', `${panX}px`);
      this.#viewportEl.style.setProperty('--pan-y', `${panY}px`);
      this.#viewportEl.style.setProperty('--zoom', String(zoom));

      this.#edgeLayer = document.createElement('canvas-edge-layer') as CanvasEdgeLayer;
      this.#edgeLayer.state = this.#state;
      this.#viewportEl.appendChild(this.#edgeLayer);

      for (const node of this.#state.nodes.values()) {
        this.#createNodeElement(node);
      }
    }
  }

  #rebuild(): void {
    const state = this.#state;
    if (!state) return;

    for (const el of this.#nodeEls.values()) el.remove();
    this.#nodeEls.clear();
    if (this.#edgeLayer) this.#edgeLayer.remove();

    this.#edgeLayer = document.createElement('canvas-edge-layer') as CanvasEdgeLayer;
    this.#edgeLayer.state = state;
    this.#viewportEl.appendChild(this.#edgeLayer);

    for (const node of state.nodes.values()) {
      this.#createNodeElement(node);
    }

    const { panX, panY, zoom } = state.viewport;
    this.#viewportEl.style.setProperty('--pan-x', `${panX}px`);
    this.#viewportEl.style.setProperty('--pan-y', `${panY}px`);
    this.#viewportEl.style.setProperty('--zoom', String(zoom));
  }

  #createNodeElement(node: Node): void {
    const el = document.createElement('canvas-node') as CanvasNode;
    el.nodeId = node.id;
    el.nodeKind = node.type;
    el.label = node.type;
    el.setPosition(node.x, node.y);
    el.state = this.#state;
    el.ports = Array.from(node.ports.values());

    this.#viewportEl.appendChild(el);
    this.#nodeEls.set(node.id, el);
  }

  #getViewportBounds(): { x: number; y: number; width: number; height: number } {
    const { panX, panY, zoom } = this.#state!.viewport;
    const rect = this.getBoundingClientRect();
    const w = rect.width || 1200;
    const h = rect.height || 800;
    return {
      x: -panX / zoom,
      y: -panY / zoom,
      width: w / zoom,
      height: h / zoom,
    };
  }

  #updateCulling(): void {
    if (!this.#state) return;
    const bounds = this.#getViewportBounds();
    const visibleIds = new Set(ViewportCulling.getVisibleNodes(this.#state, bounds));

    for (const [nodeId, el] of this.#nodeEls) {
      if (visibleIds.has(nodeId)) {
        if (el.style.display === 'none') el.style.display = '';
      } else {
        if (el.style.display !== 'none') el.style.display = 'none';
      }
    }

    this.#visibleNodeIds = visibleIds;

    if (this.#edgeLayer) {
      this.#edgeLayer.setVisibleNodes(visibleIds);
    }
  }
}

customElements.define('canvas-workspace', CanvasWorkspace);
