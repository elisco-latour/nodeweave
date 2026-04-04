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
  #canvas;
  #ctx;
  #state = null;
  #visualRegistry = null;
  #isDragging = false;
  #scale = 1;
  #offsetX = 0;
  #offsetY = 0;
  #bbMinX = 0;
  #bbMinY = 0;

  #onNodeAdded;
  #onNodeRemoved;
  #onNodeMoved;
  #onViewportChanged;
  #onStateReset;

  #onPointerDown;
  #onPointerMove;
  #onPointerUp;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.#canvas = this.shadowRoot.querySelector('canvas');
    this.#ctx = this.#canvas.getContext('2d');

    this.#onNodeAdded = () => this.render();
    this.#onNodeRemoved = () => this.render();
    this.#onNodeMoved = () => this.render();
    this.#onViewportChanged = () => this.render();
    this.#onStateReset = () => this.render();

    this.#onPointerDown = (e) => this.#handlePointerDown(e);
    this.#onPointerMove = (e) => this.#handlePointerMove(e);
    this.#onPointerUp = (e) => this.#handlePointerUp(e);
  }

  connectedCallback() {
    this.setAttribute('role', 'img');
    this.setAttribute('aria-label', 'Pipeline overview minimap');

    this.#canvas.addEventListener('pointerdown', this.#onPointerDown);
  }

  disconnectedCallback() {
    this.#canvas.removeEventListener('pointerdown', this.#onPointerDown);
    this.#detachState();
  }

  set canvasState(state) {
    this.#detachState();
    this.#state = state;
    if (this.#state) {
      this.#state.addEventListener('node-added', this.#onNodeAdded);
      this.#state.addEventListener('node-removed', this.#onNodeRemoved);
      this.#state.addEventListener('node-moved', this.#onNodeMoved);
      this.#state.addEventListener('viewport-changed', this.#onViewportChanged);
      this.#state.addEventListener('state-reset', this.#onStateReset);
      this.render();
    }
  }

  get canvasState() {
    return this.#state;
  }

  set visualRegistry(registry) {
    this.#visualRegistry = registry;
    this.render();
  }

  #detachState() {
    if (this.#state) {
      this.#state.removeEventListener('node-added', this.#onNodeAdded);
      this.#state.removeEventListener('node-removed', this.#onNodeRemoved);
      this.#state.removeEventListener('node-moved', this.#onNodeMoved);
      this.#state.removeEventListener('viewport-changed', this.#onViewportChanged);
      this.#state.removeEventListener('state-reset', this.#onStateReset);
    }
  }

  render() {
    const ctx = this.#ctx;
    const w = MINIMAP_WIDTH;
    const h = MINIMAP_HEIGHT;

    ctx.clearRect(0, 0, w, h);

    if (!this.#state || this.#state.nodes.size === 0) {
      this.#drawViewportRect(ctx, w, h);
      return;
    }

    // Compute bounding box of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of this.#state.nodes.values()) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    }

    // Add padding to bounding box
    const bbWidth = maxX - minX || 1;
    const bbHeight = maxY - minY || 1;

    // Scale to fit within minimap with padding
    const availW = w - PADDING * 2;
    const availH = h - PADDING * 2;
    const scale = Math.min(availW / bbWidth, availH / bbHeight);

    // Center the content
    const scaledW = bbWidth * scale;
    const scaledH = bbHeight * scale;
    const offsetX = PADDING + (availW - scaledW) / 2;
    const offsetY = PADDING + (availH - scaledH) / 2;

    // Store transform for pointer event conversion
    this.#scale = scale;
    this.#offsetX = offsetX;
    this.#offsetY = offsetY;
    this.#bbMinX = minX;
    this.#bbMinY = minY;

    // Draw edges as simple lines
    for (const edge of this.#state.edges.values()) {
      const sourcePort = this.#state.getPort(edge.sourcePortId);
      const targetPort = this.#state.getPort(edge.targetPortId);
      if (!sourcePort || !targetPort) continue;

      const sourceNode = this.#state.nodes.get(sourcePort.nodeId);
      const targetNode = this.#state.nodes.get(targetPort.nodeId);
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
    for (const node of this.#state.nodes.values()) {
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

    // Draw viewport indicator
    this.#drawViewportRect(ctx, w, h);
  }

  #drawViewportRect(ctx, w, h) {
    if (!this.#state) return;

    const { panX, panY, zoom } = this.#state.viewport;

    if (this.#state.nodes.size === 0) {
      // No nodes — draw viewport as full minimap
      ctx.fillStyle = VIEWPORT_COLOR;
      ctx.fillRect(0, 0, w, h);
      return;
    }

    // Viewport bounds in canvas coords:
    // visible area: x = -panX/zoom, y = -panY/zoom
    // We need to know the workspace pixel size — approximate as a standard size
    const wsWidth = 1200;
    const wsHeight = 800;
    const vpX = -panX / zoom;
    const vpY = -panY / zoom;
    const vpW = wsWidth / zoom;
    const vpH = wsHeight / zoom;

    // Convert viewport bounds to minimap coordinates
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

  #minimapToCanvas(mx, my) {
    const cx = (mx - this.#offsetX) / this.#scale + this.#bbMinX;
    const cy = (my - this.#offsetY) / this.#scale + this.#bbMinY;
    return { cx, cy };
  }

  #handlePointerDown(e) {
    e.preventDefault();
    this.#isDragging = true;
    this.#canvas.setPointerCapture(e.pointerId);
    this.#canvas.addEventListener('pointermove', this.#onPointerMove);
    this.#canvas.addEventListener('pointerup', this.#onPointerUp);
    this.#panToMinimapPos(e);
  }

  #handlePointerMove(e) {
    if (!this.#isDragging) return;
    this.#panToMinimapPos(e);
  }

  #handlePointerUp(e) {
    this.#isDragging = false;
    this.#canvas.releasePointerCapture(e.pointerId);
    this.#canvas.removeEventListener('pointermove', this.#onPointerMove);
    this.#canvas.removeEventListener('pointerup', this.#onPointerUp);
  }

  #panToMinimapPos(e) {
    if (!this.#state) return;

    const rect = this.#canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const { cx, cy } = this.#minimapToCanvas(mx, my);
    const { zoom } = this.#state.viewport;

    // Approximate workspace size
    const wsWidth = 1200;
    const wsHeight = 800;

    // Set viewport so the clicked point is in the center
    const panX = -(cx - wsWidth / (2 * zoom)) * zoom;
    const panY = -(cy - wsHeight / (2 * zoom)) * zoom;

    this.#state.setViewport(panX, panY, zoom);
  }
}

customElements.define('canvas-minimap', CanvasMinimap);
