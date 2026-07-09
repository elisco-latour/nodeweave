import type { CanvasState } from '../core/canvas-state.js';
import type { ControllerOptions } from '../types.js';

const DRAG_THRESHOLD = 3;
const DEFAULT_GRID_SIZE = 20;

export class DragController {
  readonly #workspace: HTMLElement;
  readonly #state: CanvasState;
  readonly #nodeSelector: string;
  readonly #portSelector: string;
  readonly #options: ControllerOptions;
  #isDragging = false;
  #draggedNodeId: string | null = null;
  #startX = 0;
  #startY = 0;
  #rafId: number | null = null;
  #pendingX = 0;
  #pendingY = 0;
  #hasMoved = false;
  readonly #draggedNodeStartPositions: Map<string, { x: number; y: number }> = new Map();
  #shiftHeld = false;
  #pointerId: number | null = null;

  snapToGrid = false;
  gridSize = DEFAULT_GRID_SIZE;

  readonly #onPointerDown: (e: PointerEvent) => void;
  readonly #onPointerMove: (e: PointerEvent) => void;
  readonly #onPointerUp: (e: PointerEvent) => void;

  constructor(workspace: HTMLElement, canvasState: CanvasState, options: ControllerOptions) {
    if (!options?.nodeSelector || !options?.portSelector) {
      throw new Error('DragController requires options with nodeSelector and portSelector');
    }
    this.#workspace = workspace;
    this.#state = canvasState;
    this.#nodeSelector = options.nodeSelector;
    this.#portSelector = options.portSelector;
    this.#options = options;

    if (options.snapGrid) {
      this.snapToGrid = true;
      this.gridSize = options.snapGrid[0];
    }

    this.#onPointerDown = (e) => this.#handlePointerDown(e);
    this.#onPointerMove = (e) => this.#handlePointerMove(e);
    this.#onPointerUp = (e) => this.#handlePointerUp(e);
  }

  #snapValue(v: number): number {
    return Math.round(v / this.gridSize) * this.gridSize;
  }

  attach(): void {
    this.#workspace.addEventListener('pointerdown', this.#onPointerDown as EventListener);
  }

  detach(): void {
    this.#workspace.removeEventListener('pointerdown', this.#onPointerDown as EventListener);
    this.#workspace.removeEventListener('pointermove', this.#onPointerMove as EventListener);
    this.#workspace.removeEventListener('pointerup', this.#onPointerUp as EventListener);
    if (this.#rafId !== null) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
  }

  get isDragging(): boolean { return this.#isDragging; }

  #findInComposedPath(composedPath: EventTarget[], selector: string): Element | null {
    for (const el of composedPath) {
      if ((el as Element).matches?.(selector)) return el as Element;
    }
    return null;
  }

  #handlePointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;

    const path = e.composedPath();
    if (this.#findInComposedPath(path, this.#portSelector)) return;

    const nodeEl = this.#findInComposedPath(path, this.#nodeSelector) as (Element & { nodeId?: string }) | null;
    if (!nodeEl) return;

    const nodeId = nodeEl.nodeId;
    if (!nodeId) return;

    this.#draggedNodeId = nodeId;
    this.#startX = e.clientX;
    this.#startY = e.clientY;
    this.#hasMoved = false;

    this.#draggedNodeStartPositions.clear();
    const selected = this.#state.selectedNodeIds;
    if (selected.has(nodeId)) {
      for (const id of selected) {
        const node = this.#state.nodes.get(id);
        if (node) this.#draggedNodeStartPositions.set(id, { x: node.x, y: node.y });
      }
    } else {
      const node = this.#state.nodes.get(nodeId);
      if (node) this.#draggedNodeStartPositions.set(nodeId, { x: node.x, y: node.y });
    }

    this.#pointerId = e.pointerId;
    this.#shiftHeld = e.shiftKey;
    this.#workspace.addEventListener('pointermove', this.#onPointerMove as EventListener);
    this.#workspace.addEventListener('pointerup', this.#onPointerUp as EventListener);
  }

  #handlePointerMove(e: PointerEvent): void {
    this.#shiftHeld = e.shiftKey;
    const dx = e.clientX - this.#startX;
    const dy = e.clientY - this.#startY;

    if (!this.#isDragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      this.#isDragging = true;
      this.#hasMoved = true;
      this.#setAriaGrabbed(true);
    }

    const zoom = this.#state.viewport.zoom;
    this.#pendingX = dx / zoom;
    this.#pendingY = dy / zoom;

    if (this.#rafId === null) {
      this.#rafId = requestAnimationFrame(() => {
        this.#applyDrag(this.#pendingX, this.#pendingY);
        this.#rafId = null;
      });
    }
  }

  #applyDrag(canvasDx: number, canvasDy: number): void {
    for (const [id, start] of this.#draggedNodeStartPositions) {
      const x = start.x + canvasDx;
      const y = start.y + canvasDy;
      this.#state.moveNodeDirect(id, x, y);
      this.#options.onNodeDrag?.(id, x, y);
    }
  }

  #handlePointerUp(e: PointerEvent): void {
    this.#workspace.removeEventListener('pointermove', this.#onPointerMove as EventListener);
    this.#workspace.removeEventListener('pointerup', this.#onPointerUp as EventListener);
    this.#pointerId = null;

    if (this.#rafId !== null) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }

    if (this.#isDragging) {
      this.#setAriaGrabbed(false);

      const positionMap = new Map<string, { x: number; y: number }>();
      const shouldSnap = this.snapToGrid || this.#shiftHeld;
      for (const [id, start] of this.#draggedNodeStartPositions) {
        const node = this.#state.nodes.get(id);
        if (node && (node.x !== start.x || node.y !== start.y)) {
          let finalX = node.x;
          let finalY = node.y;
          if (shouldSnap) {
            finalX = this.#snapValue(finalX);
            finalY = this.#snapValue(finalY);
          }
          node.x = start.x;
          node.y = start.y;
          positionMap.set(id, { x: finalX, y: finalY });
          this.#options.onNodeDragStop?.(id, finalX, finalY);
        }
      }

      if (positionMap.size > 0) this.#state.setNodePositions(positionMap);
    }

    this.#isDragging = false;
    this.#draggedNodeId = null;
    this.#draggedNodeStartPositions.clear();
  }

  #getNodeElements(): NodeListOf<Element> {
    return this.#workspace.shadowRoot
      ? this.#workspace.shadowRoot.querySelectorAll(this.#nodeSelector)
      : this.#workspace.querySelectorAll(this.#nodeSelector);
  }

  #setAriaGrabbed(grabbed: boolean): void {
    const value = grabbed ? 'true' : 'false';
    for (const el of this.#getNodeElements()) {
      if (this.#draggedNodeStartPositions.has((el as Element & { nodeId?: string }).nodeId ?? '')) {
        el.setAttribute('aria-grabbed', value);
      }
    }
  }
}
