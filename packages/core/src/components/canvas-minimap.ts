import type { CanvasState } from '../core/canvas-state.js';
import type { VisualRegistry } from '../registries/visual-registry.js';

const MINIMAP_WIDTH = 200;
const MINIMAP_HEIGHT = 140;
const PADDING = 10;
const VIEWPORT_COLOR = 'rgba(77, 171, 247, 0.3)';
const VIEWPORT_STROKE = 'rgba(77, 171, 247, 0.8)';
const EDGE_COLOR = '#666';
const NODE_FALLBACK_COLOR = '#888';

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: block;
    position: fixed;
    bottom: 16px;
    left: 16px;
    width: ${MINIMAP_WIDTH}px;
    height: ${MINIMAP_HEIGHT}px;
    z-index: 50;
    border: 1px solid var(--vc-toolbar-border, #2a3a5e);
    border-radius: var(--radius-sm, 4px);
    background: var(--vc-node-bg, #16213e);
    overflow: hidden;
    cursor: pointer;
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
<canvas width="${MINIMAP_WIDTH}" height="${MINIMAP_HEIGHT}"></canvas>
`;

export class CanvasMinimap extends HTMLElement {
  readonly #root: ShadowRoot;
  readonly #canvas: HTMLCanvasElement;
  readonly #ctx: CanvasRenderingContext2D;
  #state: CanvasState | null = null;
  #visualRegistry: VisualRegistry | null = null;
  #isDragging = false;
  #scale = 1;
  #offsetX = 0;
  #offsetY = 0;
  #bbMinX = 0;
  #bbMinY = 0;

  readonly #onNodeAdded: () => void;
  readonly #onNodeRemoved: () => void;
  readonly #onNodeMoved: () => void;
  readonly #onNodeResized: () => void;
  readonly #onViewportChanged: () => void;
  readonly #onStateReset: () => void;

  readonly #onPointerDown: (e: PointerEvent) => void;
  readonly #onPointerMove: (e: PointerEvent) => void;
  readonly #onPointerUp: (e: PointerEvent) => void;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
    this.#root.appendChild(template.content.cloneNode(true));
    this.#canvas = this.#root.querySelector('canvas')!;
    this.#ctx = this.#canvas.getContext('2d')!;

    this.#onNodeAdded = () => this.render();
    this.#onNodeRemoved = () => this.render();
    this.#onNodeMoved = () => this.render();
    this.#onNodeResized = () => this.render();
    this.#onViewportChanged = () => this.render();
    this.#onStateReset = () => this.render();

    this.#onPointerDown = (e: PointerEvent) => this.#handlePointerDown(e);
    this.#onPointerMove = (e: PointerEvent) => this.#handlePointerMove(e);
    this.#onPointerUp = (e: PointerEvent) => this.#handlePointerUp(e);
  }

  connectedCallback(): void {
    this.setAttribute('role', 'img');
    this.setAttribute('aria-label', 'Pipeline overview minimap');
    this.#canvas.addEventListener('pointerdown', this.#onPointerDown);
  }

  disconnectedCallback(): void {
    this.#canvas.removeEventListener('pointerdown', this.#onPointerDown);
    this.#detachState();
  }

  set canvasState(state: CanvasState | null) {
    this.#detachState();
    this.#state = state;
    if (this.#state) {
      this.#state.addEventListener('node-added', this.#onNodeAdded);
      this.#state.addEventListener('node-removed', this.#onNodeRemoved);
      this.#state.addEventListener('node-moved', this.#onNodeMoved);
      this.#state.addEventListener('node-resized', this.#onNodeResized);
      this.#state.addEventListener('viewport-changed', this.#onViewportChanged);
      this.#state.addEventListener('state-reset', this.#onStateReset);
      this.render();
    }
  }

  get canvasState(): CanvasState | null {
    return this.#state;
  }

  set visualRegistry(registry: VisualRegistry | null) {
    this.#visualRegistry = registry;
    this.render();
  }

  #detachState(): void {
    if (this.#state) {
      this.#state.removeEventListener('node-added', this.#onNodeAdded);
      this.#state.removeEventListener('node-removed', this.#onNodeRemoved);
      this.#state.removeEventListener('node-moved', this.#onNodeMoved);
      this.#state.removeEventListener('node-resized', this.#onNodeResized);
      this.#state.removeEventListener('viewport-changed', this.#onViewportChanged);
      this.#state.removeEventListener('state-reset', this.#onStateReset);
    }
  }

  render(): void {
    const ctx = this.#ctx;
    const w = MINIMAP_WIDTH;
    const h = MINIMAP_HEIGHT;

    ctx.clearRect(0, 0, w, h);

    const state = this.#state;
    if (!state || state.nodes.size === 0) {
      this.#drawViewportRect(ctx, w, h);
      return;
    }

    // Compute bounding box of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of state.nodes.values()) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    }

    const bbWidth = maxX - minX || 1;
    const bbHeight = maxY - minY || 1;

    const availW = w - PADDING * 2;
    const availH = h - PADDING * 2;
    const scale = Math.min(availW / bbWidth, availH / bbHeight);

    const scaledW = bbWidth * scale;
    const scaledH = bbHeight * scale;
    const offsetX = PADDING + (availW - scaledW) / 2;
    const offsetY = PADDING + (availH - scaledH) / 2;

    this.#scale = scale;
    this.#offsetX = offsetX;
    this.#offsetY = offsetY;
    this.#bbMinX = minX;
    this.#bbMinY = minY;

    // Draw edges as simple lines
    for (const edge of state.edges.values()) {
      const sourcePort = state.getPort(edge.sourcePortId);
      const targetPort = state.getPort(edge.targetPortId);
      if (!sourcePort || !targetPort) continue;

      const sourceNode = state.nodes.get(sourcePort.nodeId);
      const targetNode = state.nodes.get(targetPort.nodeId);
      if (!sourceNode || !targetNode) continue;

      const sx = offsetX + (sourceNode.x + sourceNode.width / 2 - minX) * scale;
      const sy = offsetY + (sourceNode.y + sourceNode.height / 2 - minY) * scale;
      const tx = offsetX + (targetNode.x + targetNode.width / 2 - minX) * scale;
      const ty = offsetY + (targetNode.y + targetNode.height / 2 - minY) * scale;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = EDGE_COLOR;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw nodes as filled rectangles
    for (const node of state.nodes.values()) {
      const nx = offsetX + (node.x - minX) * scale;
      const ny = offsetY + (node.y - minY) * scale;
      const nw = Math.max(node.width * scale, 4);
      const nh = Math.max(node.height * scale, 3);

      let color = NODE_FALLBACK_COLOR;
      if (this.#visualRegistry) {
        try {
          const visual = this.#visualRegistry.get(node.type);
          color = visual.color;
        } catch {
          // fallback
        }
      }

      ctx.fillStyle = color;
      ctx.fillRect(nx, ny, nw, nh);
    }

    this.#drawViewportRect(ctx, w, h);
  }

  #drawViewportRect(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const state = this.#state;
    if (!state) return;

    const { panX, panY, zoom } = state.viewport;

    if (state.nodes.size === 0) {
      // No nodes — draw viewport as full minimap
      ctx.fillStyle = VIEWPORT_COLOR;
      ctx.fillRect(0, 0, w, h);
      return;
    }

    // Approximate the workspace pixel size
    const wsWidth = 1200;
    const wsHeight = 800;
    const vpX = -panX / zoom;
    const vpY = -panY / zoom;
    const vpW = wsWidth / zoom;
    const vpH = wsHeight / zoom;

    const scale = this.#scale;
    const offsetX = this.#offsetX;
    const offsetY = this.#offsetY;
    const minX = this.#bbMinX;
    const minY = this.#bbMinY;

    const rx = offsetX + (vpX - minX) * scale;
    const ry = offsetY + (vpY - minY) * scale;
    const rw = vpW * scale;
    const rh = vpH * scale;

    ctx.fillStyle = VIEWPORT_COLOR;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = VIEWPORT_STROKE;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rx, ry, rw, rh);
  }

  #minimapToCanvas(mx: number, my: number): { cx: number; cy: number } {
    const cx = (mx - this.#offsetX) / this.#scale + this.#bbMinX;
    const cy = (my - this.#offsetY) / this.#scale + this.#bbMinY;
    return { cx, cy };
  }

  #handlePointerDown(e: PointerEvent): void {
    e.preventDefault();
    this.#isDragging = true;
    this.#canvas.setPointerCapture(e.pointerId);
    this.#canvas.addEventListener('pointermove', this.#onPointerMove);
    this.#canvas.addEventListener('pointerup', this.#onPointerUp);
    this.#panToMinimapPos(e);
  }

  #handlePointerMove(e: PointerEvent): void {
    if (!this.#isDragging) return;
    this.#panToMinimapPos(e);
  }

  #handlePointerUp(e: PointerEvent): void {
    this.#isDragging = false;
    this.#canvas.releasePointerCapture(e.pointerId);
    this.#canvas.removeEventListener('pointermove', this.#onPointerMove);
    this.#canvas.removeEventListener('pointerup', this.#onPointerUp);
  }

  #panToMinimapPos(e: PointerEvent): void {
    const state = this.#state;
    if (!state) return;

    const rect = this.#canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const { cx, cy } = this.#minimapToCanvas(mx, my);
    const { zoom } = state.viewport;

    const wsWidth = 1200;
    const wsHeight = 800;

    const panX = -(cx - wsWidth / (2 * zoom)) * zoom;
    const panY = -(cy - wsHeight / (2 * zoom)) * zoom;

    state.setViewport(panX, panY, zoom);
  }
}

customElements.define('canvas-minimap', CanvasMinimap);
