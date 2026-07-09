import type { CanvasState } from '../core/canvas-state.js';
import type { ControllerOptions } from '../types.js';

const CLICK_THRESHOLD = 3;

export class SelectionController {
  readonly #workspace: HTMLElement;
  readonly #state: CanvasState;
  readonly #nodeSelector: string;
  readonly #portSelector: string;
  #isRubberBand = false;
  #rubberBandEl: HTMLDivElement | null = null;
  #startX = 0;
  #startY = 0;
  #pointerStartX = 0;
  #pointerStartY = 0;

  readonly #onPointerDown: (e: PointerEvent) => void;
  readonly #onPointerMove: (e: PointerEvent) => void;
  readonly #onPointerUp: (e: PointerEvent) => void;

  constructor(workspace: HTMLElement, canvasState: CanvasState, options: ControllerOptions) {
    if (!options?.nodeSelector || !options?.portSelector) {
      throw new Error('SelectionController requires options with nodeSelector and portSelector');
    }
    this.#workspace = workspace;
    this.#state = canvasState;
    this.#nodeSelector = options.nodeSelector;
    this.#portSelector = options.portSelector;

    this.#onPointerDown = (e) => this.#handlePointerDown(e);
    this.#onPointerMove = (e) => this.#handlePointerMove(e);
    this.#onPointerUp = (e) => this.#handlePointerUp(e);
  }

  attach(): void {
    this.#workspace.addEventListener('pointerdown', this.#onPointerDown as EventListener);
  }

  detach(): void {
    this.#workspace.removeEventListener('pointerdown', this.#onPointerDown as EventListener);
    document.removeEventListener('pointermove', this.#onPointerMove);
    document.removeEventListener('pointerup', this.#onPointerUp);
    this.#removeRubberBand();
  }

  #getNodeElements(): NodeListOf<Element> {
    return this.#workspace.shadowRoot
      ? this.#workspace.shadowRoot.querySelectorAll(this.#nodeSelector)
      : this.#workspace.querySelectorAll(this.#nodeSelector);
  }

  #findInComposedPath(path: EventTarget[], selector: string): (Element & { nodeId?: string }) | null {
    for (const el of path) {
      if ((el as Element).matches?.(selector)) return el as Element & { nodeId?: string };
    }
    return null;
  }

  #handlePointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    const path = e.composedPath();
    if (this.#findInComposedPath(path, this.#portSelector)) return;

    this.#pointerStartX = e.clientX;
    this.#pointerStartY = e.clientY;

    const nodeEl = this.#findInComposedPath(path, this.#nodeSelector);
    if (nodeEl) {
      document.addEventListener('pointerup', this.#onPointerUp as EventListener, { once: true });
      return;
    }

    this.#startX = e.clientX;
    this.#startY = e.clientY;
    document.addEventListener('pointermove', this.#onPointerMove);
    document.addEventListener('pointerup', this.#onPointerUp);
  }

  #handlePointerMove(e: PointerEvent): void {
    const dx = Math.abs(e.clientX - this.#startX);
    const dy = Math.abs(e.clientY - this.#startY);

    if (!this.#isRubberBand && (dx > CLICK_THRESHOLD || dy > CLICK_THRESHOLD)) {
      this.#isRubberBand = true;
      this.#createRubberBand();
    }

    if (this.#isRubberBand) this.#updateRubberBand(e.clientX, e.clientY);
  }

  #handlePointerUp(e: PointerEvent): void {
    document.removeEventListener('pointermove', this.#onPointerMove);
    document.removeEventListener('pointerup', this.#onPointerUp as EventListener);

    if (this.#isRubberBand) {
      this.#completeRubberBand(e);
      this.#isRubberBand = false;
      return;
    }

    const dx = Math.abs(e.clientX - this.#pointerStartX);
    const dy = Math.abs(e.clientY - this.#pointerStartY);
    if (dx >= CLICK_THRESHOLD || dy >= CLICK_THRESHOLD) return;

    const nodeEl = this.#findInComposedPath(e.composedPath(), this.#nodeSelector);
    if (nodeEl) {
      const nodeId = nodeEl.nodeId;
      if (nodeId) {
        if (e.ctrlKey || e.metaKey) {
          this.#state.toggleNodeSelection(nodeId);
        } else {
          this.#state.selectNode(nodeId);
        }
      }
    } else {
      this.#state.clearSelection();
    }
  }

  #createRubberBand(): void {
    this.#rubberBandEl = document.createElement('div');
    Object.assign(this.#rubberBandEl.style, {
      position: 'fixed',
      border: '1px dashed var(--nw-selection-border, #4dabf7)',
      background: 'var(--nw-selection-bg, rgba(77, 171, 247, 0.1))',
      pointerEvents: 'none',
      zIndex: '9999',
    });
    document.body.appendChild(this.#rubberBandEl);
  }

  #updateRubberBand(currentX: number, currentY: number): void {
    if (!this.#rubberBandEl) return;
    Object.assign(this.#rubberBandEl.style, {
      left: `${Math.min(this.#startX, currentX)}px`,
      top: `${Math.min(this.#startY, currentY)}px`,
      width: `${Math.abs(currentX - this.#startX)}px`,
      height: `${Math.abs(currentY - this.#startY)}px`,
    });
  }

  #completeRubberBand(e: PointerEvent): void {
    const { panX, panY, zoom } = this.#state.viewport;
    const wsRect = this.#workspace.getBoundingClientRect();

    const left   = (Math.min(this.#startX, e.clientX) - wsRect.left - panX) / zoom;
    const top    = (Math.min(this.#startY, e.clientY) - wsRect.top  - panY) / zoom;
    const right  = (Math.max(this.#startX, e.clientX) - wsRect.left - panX) / zoom;
    const bottom = (Math.max(this.#startY, e.clientY) - wsRect.top  - panY) / zoom;

    const intersecting: string[] = [];
    for (const node of this.#state.nodes.values()) {
      if (node.x < right && node.x + node.width > left &&
          node.y < bottom && node.y + node.height > top) {
        intersecting.push(node.id);
      }
    }

    this.#state.selectNodes(intersecting);
    this.#removeRubberBand();
  }

  #removeRubberBand(): void {
    this.#rubberBandEl?.remove();
    this.#rubberBandEl = null;
  }
}
