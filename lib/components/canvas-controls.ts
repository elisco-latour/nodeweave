import type { CanvasState } from '../core/canvas-state.js';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 1.2;
const FIT_PADDING = 40;

// Events after which the undo/redo buttons may need re-enabling/disabling.
const HISTORY_EVENTS = [
  'node-added', 'node-removed', 'node-moved', 'node-resized',
  'edge-added', 'edge-removed', 'node-config-updated', 'state-reset',
];

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: inline-flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px;
    background: var(--vc-controls-bg, #16213e);
    border: 1px solid var(--vc-controls-border, #2a3a5e);
    border-radius: var(--vc-controls-radius, 8px);
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  }
  button {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-radius: 4px;
    color: var(--vc-controls-fg, #e0e0e0);
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
  }
  button:hover:not(:disabled) {
    background: var(--vc-controls-hover, rgba(255,255,255,0.1));
  }
  button:focus-visible {
    outline: 2px solid var(--vc-focus-ring-color, #4dabf7);
    outline-offset: -1px;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
<button type="button" data-action="zoom-in" aria-label="Zoom in" title="Zoom in">+</button>
<button type="button" data-action="zoom-out" aria-label="Zoom out" title="Zoom out">&#8722;</button>
<button type="button" data-action="fit" aria-label="Fit view" title="Fit view">&#10530;</button>
<button type="button" data-action="undo" aria-label="Undo" title="Undo">&#8630;</button>
<button type="button" data-action="redo" aria-label="Redo" title="Redo">&#8631;</button>
<slot></slot>
`;

/**
 * <canvas-controls> — a control panel with zoom in/out, fit view, undo, redo.
 *
 * Assign `.state` (required) and optionally `.workspace` (used to size the
 * viewport for zoom-centering and fit). Extra buttons can be added via the
 * default slot.
 */
export class CanvasControls extends HTMLElement {
  readonly #root: ShadowRoot;
  #state: CanvasState | null = null;
  #workspace: HTMLElement | null = null;
  readonly #undoBtn: HTMLButtonElement;
  readonly #redoBtn: HTMLButtonElement;
  readonly #onClick: (e: Event) => void;
  readonly #onHistoryChanged: () => void;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
    this.#root.appendChild(template.content.cloneNode(true));
    this.#undoBtn = this.#root.querySelector('[data-action="undo"]')!;
    this.#redoBtn = this.#root.querySelector('[data-action="redo"]')!;

    this.#onClick = (e: Event) => this.#handleClick(e);
    this.#onHistoryChanged = () => this.#updateHistoryButtons();
  }

  connectedCallback(): void {
    this.setAttribute('role', 'group');
    this.setAttribute('aria-label', 'Canvas controls');
    this.#root.addEventListener('click', this.#onClick);
    this.#updateHistoryButtons();
  }

  disconnectedCallback(): void {
    this.#root.removeEventListener('click', this.#onClick);
    this.#detachState();
  }

  get state(): CanvasState | null { return this.#state; }
  set state(s: CanvasState | null) {
    this.#detachState();
    this.#state = s;
    if (this.#state) {
      for (const evt of HISTORY_EVENTS) {
        this.#state.addEventListener(evt, this.#onHistoryChanged);
      }
    }
    this.#updateHistoryButtons();
  }

  get workspace(): HTMLElement | null { return this.#workspace; }
  set workspace(el: HTMLElement | null) { this.#workspace = el; }

  #detachState(): void {
    if (this.#state) {
      for (const evt of HISTORY_EVENTS) {
        this.#state.removeEventListener(evt, this.#onHistoryChanged);
      }
    }
  }

  #handleClick(e: Event): void {
    const btn = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
    const action = btn?.dataset.action;
    switch (action) {
      case 'zoom-in': this.zoomIn(); break;
      case 'zoom-out': this.zoomOut(); break;
      case 'fit': this.fitView(); break;
      case 'undo': this.undo(); break;
      case 'redo': this.redo(); break;
    }
  }

  #updateHistoryButtons(): void {
    const history = this.#state?.commandHistory;
    this.#undoBtn.disabled = !history?.canUndo;
    this.#redoBtn.disabled = !history?.canRedo;
  }

  #viewSize(): { w: number; h: number } {
    if (this.#workspace) {
      const r = this.#workspace.getBoundingClientRect();
      if (r.width && r.height) return { w: r.width, h: r.height };
    }
    return { w: 1200, h: 800 };
  }

  #zoomBy(factor: number): void {
    if (!this.#state) return;
    const { panX, panY, zoom } = this.#state.viewport;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
    if (newZoom === zoom) return;
    const { w, h } = this.#viewSize();
    const cx = w / 2;
    const cy = h / 2;
    const newPanX = cx - (cx - panX) * (newZoom / zoom);
    const newPanY = cy - (cy - panY) * (newZoom / zoom);
    this.#state.setViewport(newPanX, newPanY, newZoom);
  }

  zoomIn(): void { this.#zoomBy(ZOOM_STEP); }
  zoomOut(): void { this.#zoomBy(1 / ZOOM_STEP); }

  fitView(padding = FIT_PADDING): void {
    if (!this.#state) return;
    const nodes = [...this.#state.nodes.values()];
    if (nodes.length === 0) {
      this.#state.setViewport(0, 0, 1);
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.width);
      maxY = Math.max(maxY, n.y + n.height);
    }
    const bw = maxX - minX || 1;
    const bh = maxY - minY || 1;

    const { w, h } = this.#viewSize();
    const availW = Math.max(1, w - padding * 2);
    const availH = Math.max(1, h - padding * 2);
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(availW / bw, availH / bh)));

    const panX = padding + (availW - bw * zoom) / 2 - minX * zoom;
    const panY = padding + (availH - bh * zoom) / 2 - minY * zoom;
    this.#state.setViewport(panX, panY, zoom);
  }

  undo(): void { this.#state?.commandHistory.undo(); this.#updateHistoryButtons(); }
  redo(): void { this.#state?.commandHistory.redo(); this.#updateHistoryButtons(); }
}

customElements.define('canvas-controls', CanvasControls);
