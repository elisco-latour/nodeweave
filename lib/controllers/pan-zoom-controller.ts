import type { CanvasState } from '../core/canvas-state.js';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3.0;

export class PanZoomController {
  readonly #workspace: HTMLElement;
  readonly #state: CanvasState;
  #isPanning = false;
  #spaceHeld = false;
  #panStartX = 0;
  #panStartY = 0;
  #panStartPanX = 0;
  #panStartPanY = 0;
  #pointerId: number | null = null;

  readonly #onWheel: (e: WheelEvent) => void;
  readonly #onPointerDown: (e: PointerEvent) => void;
  readonly #onPointerMove: (e: PointerEvent) => void;
  readonly #onPointerUp: (e: PointerEvent) => void;
  readonly #onKeyDown: (e: KeyboardEvent) => void;
  readonly #onKeyUp: (e: KeyboardEvent) => void;
  readonly #onContextMenu: (e: MouseEvent) => void;

  constructor(workspace: HTMLElement, canvasState: CanvasState) {
    this.#workspace = workspace;
    this.#state = canvasState;

    this.#onWheel = (e) => this.#handleWheel(e);
    this.#onPointerDown = (e) => this.#handlePointerDown(e);
    this.#onPointerMove = (e) => this.#handlePointerMove(e);
    this.#onPointerUp = (e) => this.#handlePointerUp(e);
    this.#onKeyDown = (e) => this.#handleKeyDown(e);
    this.#onKeyUp = (e) => this.#handleKeyUp(e);
    this.#onContextMenu = (e) => { if (e.button === 1) e.preventDefault(); };
  }

  attach(): void {
    this.#workspace.addEventListener('wheel', this.#onWheel as EventListener, { passive: false });
    this.#workspace.addEventListener('pointerdown', this.#onPointerDown as EventListener);
    this.#workspace.addEventListener('contextmenu', this.#onContextMenu as EventListener);
    document.addEventListener('keydown', this.#onKeyDown);
    document.addEventListener('keyup', this.#onKeyUp);
  }

  detach(): void {
    this.#workspace.removeEventListener('wheel', this.#onWheel as EventListener);
    this.#workspace.removeEventListener('pointerdown', this.#onPointerDown as EventListener);
    this.#workspace.removeEventListener('contextmenu', this.#onContextMenu as EventListener);
    document.removeEventListener('pointermove', this.#onPointerMove);
    document.removeEventListener('pointerup', this.#onPointerUp);
    document.removeEventListener('keydown', this.#onKeyDown);
    document.removeEventListener('keyup', this.#onKeyUp);
    this.#spaceHeld = false;
    this.#isPanning = false;
  }

  #handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const { panX, panY, zoom } = this.#state.viewport;
    const factor = 0.999 ** e.deltaY;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));

    const rect = this.#workspace.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    const newPanX = cursorX - (cursorX - panX) * (newZoom / zoom);
    const newPanY = cursorY - (cursorY - panY) * (newZoom / zoom);

    this.#state.setViewport(newPanX, newPanY, newZoom);
  }

  #handlePointerDown(e: PointerEvent): void {
    const isMiddle = e.button === 1;
    const isSpaceLeft = e.button === 0 && this.#spaceHeld;
    if (!isMiddle && !isSpaceLeft) return;

    e.preventDefault();
    this.#isPanning = true;
    this.#pointerId = e.pointerId;
    this.#panStartX = e.clientX;
    this.#panStartY = e.clientY;

    const { panX, panY } = this.#state.viewport;
    this.#panStartPanX = panX;
    this.#panStartPanY = panY;

    this.#workspace.setPointerCapture(e.pointerId);
    this.#workspace.style.cursor = 'grabbing';

    document.addEventListener('pointermove', this.#onPointerMove);
    document.addEventListener('pointerup', this.#onPointerUp);
  }

  #handlePointerMove(e: PointerEvent): void {
    if (!this.#isPanning) return;
    const dx = e.clientX - this.#panStartX;
    const dy = e.clientY - this.#panStartY;
    const { zoom } = this.#state.viewport;
    this.#state.setViewport(this.#panStartPanX + dx, this.#panStartPanY + dy, zoom);
  }

  #handlePointerUp(_e: PointerEvent): void {
    if (!this.#isPanning) return;
    this.#isPanning = false;
    if (this.#pointerId !== null) {
      this.#workspace.releasePointerCapture(this.#pointerId);
    }
    this.#workspace.style.cursor = this.#spaceHeld ? 'grab' : '';
    this.#pointerId = null;
    document.removeEventListener('pointermove', this.#onPointerMove);
    document.removeEventListener('pointerup', this.#onPointerUp);
  }

  #handleKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space' && !e.repeat) {
      this.#spaceHeld = true;
      if (!this.#isPanning) this.#workspace.style.cursor = 'grab';
    }
  }

  #handleKeyUp(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      this.#spaceHeld = false;
      if (!this.#isPanning) this.#workspace.style.cursor = '';
    }
  }
}
