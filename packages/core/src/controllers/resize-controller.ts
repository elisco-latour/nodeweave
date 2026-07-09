import type { CanvasState } from '../core/canvas-state.js';
import type { ControllerOptions, NodeGeometry } from '../types.js';
import type { Node } from '../core/graph.js';

type HandlePos = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const HANDLES: HandlePos[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const HANDLE_SIZE = 8;
const DEFAULT_MIN_WIDTH = 80;
const DEFAULT_MIN_HEIGHT = 40;

const CURSORS: Record<HandlePos, string> = {
  nw: 'nwse-resize', n: 'ns-resize', ne: 'nesw-resize', e: 'ew-resize',
  se: 'nwse-resize', s: 'ns-resize', sw: 'nesw-resize', w: 'ew-resize',
};

/**
 * ResizeController — draws 8 resize handles around the single selected node
 * and resizes it via pointer drag.
 *
 * Handles live in a screen-space overlay on document.body (like the rubber
 * band), so the controller stays agnostic of the node component: it drives
 * CanvasState.resizeNodeDirect() for live preview and resizeNode() to commit
 * (undoable). Node components reflect the change by listening to 'node-resized'.
 */
export class ResizeController {
  readonly #workspace: HTMLElement;
  readonly #state: CanvasState;

  #overlay: HTMLDivElement | null = null;
  #outline: HTMLDivElement | null = null;
  readonly #handleEls: Map<HandlePos, HTMLDivElement> = new Map();

  #activeHandle: HandlePos | null = null;
  #nodeId: string | null = null;
  #startGeom: NodeGeometry = { x: 0, y: 0, width: 0, height: 0 };
  #startPointerX = 0;
  #startPointerY = 0;

  minWidth = DEFAULT_MIN_WIDTH;
  minHeight = DEFAULT_MIN_HEIGHT;
  snapGrid: [number, number] | null = null;

  readonly #onRefresh: () => void;
  readonly #onHandlePointerDown: (e: PointerEvent) => void;
  readonly #onPointerMove: (e: PointerEvent) => void;
  readonly #onPointerUp: (e: PointerEvent) => void;

  constructor(workspace: HTMLElement, canvasState: CanvasState, options?: ControllerOptions) {
    this.#workspace = workspace;
    this.#state = canvasState;
    if (options?.snapGrid) this.snapGrid = options.snapGrid;

    this.#onRefresh = () => this.#reposition();
    this.#onHandlePointerDown = (e) => this.#handlePointerDown(e);
    this.#onPointerMove = (e) => this.#handlePointerMove(e);
    this.#onPointerUp = () => this.#handlePointerUp();
  }

  attach(): void {
    this.#createOverlay();
    this.#state.addEventListener('selection-changed', this.#onRefresh);
    this.#state.addEventListener('viewport-changed', this.#onRefresh);
    this.#state.addEventListener('node-moved', this.#onRefresh);
    this.#state.addEventListener('node-resized', this.#onRefresh);
    this.#state.addEventListener('state-reset', this.#onRefresh);
    this.#reposition();
  }

  detach(): void {
    this.#state.removeEventListener('selection-changed', this.#onRefresh);
    this.#state.removeEventListener('viewport-changed', this.#onRefresh);
    this.#state.removeEventListener('node-moved', this.#onRefresh);
    this.#state.removeEventListener('node-resized', this.#onRefresh);
    this.#state.removeEventListener('state-reset', this.#onRefresh);
    document.removeEventListener('pointermove', this.#onPointerMove);
    document.removeEventListener('pointerup', this.#onPointerUp);
    this.#overlay?.remove();
    this.#overlay = null;
    this.#outline = null;
    this.#handleEls.clear();
  }

  #createOverlay(): void {
    if (this.#overlay) return;

    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      pointerEvents: 'none',
      zIndex: '9998',
      display: 'none',
    });

    const outline = document.createElement('div');
    Object.assign(outline.style, {
      position: 'fixed',
      boxSizing: 'border-box',
      border: '1px solid var(--nw-resize-outline, #4dabf7)',
      pointerEvents: 'none',
    });
    overlay.appendChild(outline);
    this.#outline = outline;

    for (const pos of HANDLES) {
      const handle = document.createElement('div');
      handle.dataset.handle = pos;
      Object.assign(handle.style, {
        position: 'fixed',
        width: `${HANDLE_SIZE}px`,
        height: `${HANDLE_SIZE}px`,
        boxSizing: 'border-box',
        background: 'var(--nw-resize-handle, #fff)',
        border: '1px solid var(--nw-resize-handle-border, #4dabf7)',
        borderRadius: '2px',
        pointerEvents: 'auto',
        cursor: CURSORS[pos],
        touchAction: 'none',
      });
      overlay.appendChild(handle);
      this.#handleEls.set(pos, handle);
    }

    // Delegated: pointerdown on a handle bubbles up to the overlay.
    overlay.addEventListener('pointerdown', this.#onHandlePointerDown as EventListener);

    document.body.appendChild(overlay);
    this.#overlay = overlay;
  }

  #selectedNode(): Node | null {
    const ids = this.#state.selectedNodeIds;
    if (ids.size !== 1) return null;
    const id = ids.values().next().value as string;
    return this.#state.nodes.get(id) ?? null;
  }

  #reposition(): void {
    if (!this.#overlay || !this.#outline) return;

    const node = this.#selectedNode();
    if (!node) {
      this.#overlay.style.display = 'none';
      return;
    }
    this.#overlay.style.display = '';

    const { panX, panY, zoom } = this.#state.viewport;
    const ws = this.#workspace.getBoundingClientRect();
    const left = ws.left + panX + node.x * zoom;
    const top = ws.top + panY + node.y * zoom;
    const width = node.width * zoom;
    const height = node.height * zoom;

    Object.assign(this.#outline.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    });

    const anchors: Record<HandlePos, [number, number]> = {
      nw: [left, top],
      n: [left + width / 2, top],
      ne: [left + width, top],
      e: [left + width, top + height / 2],
      se: [left + width, top + height],
      s: [left + width / 2, top + height],
      sw: [left, top + height],
      w: [left, top + height / 2],
    };

    for (const [pos, el] of this.#handleEls) {
      const [ax, ay] = anchors[pos];
      el.style.left = `${ax - HANDLE_SIZE / 2}px`;
      el.style.top = `${ay - HANDLE_SIZE / 2}px`;
    }
  }

  #handlePointerDown(e: PointerEvent): void {
    const target = e.target as HTMLElement | null;
    const handle = target?.dataset?.handle as HandlePos | undefined;
    if (!handle) return;
    const node = this.#selectedNode();
    if (!node) return;

    e.preventDefault();
    e.stopPropagation();

    this.#activeHandle = handle;
    this.#nodeId = node.id;
    this.#startGeom = { x: node.x, y: node.y, width: node.width, height: node.height };
    this.#startPointerX = e.clientX;
    this.#startPointerY = e.clientY;
    try { target!.setPointerCapture(e.pointerId); } catch { /* pointer not active */ }

    document.addEventListener('pointermove', this.#onPointerMove);
    document.addEventListener('pointerup', this.#onPointerUp);
  }

  #handlePointerMove(e: PointerEvent): void {
    if (!this.#activeHandle || !this.#nodeId) return;
    const zoom = this.#state.viewport.zoom;
    const dx = (e.clientX - this.#startPointerX) / zoom;
    const dy = (e.clientY - this.#startPointerY) / zoom;
    const g = this.#computeGeom(this.#activeHandle, dx, dy);
    this.#state.resizeNodeDirect(this.#nodeId, g.x, g.y, g.width, g.height);
  }

  #handlePointerUp(): void {
    document.removeEventListener('pointermove', this.#onPointerMove);
    document.removeEventListener('pointerup', this.#onPointerUp);

    if (this.#activeHandle && this.#nodeId) {
      const node = this.#state.nodes.get(this.#nodeId);
      if (node) {
        const final: NodeGeometry = { x: node.x, y: node.y, width: node.width, height: node.height };
        const s = this.#startGeom;
        const changed = final.x !== s.x || final.y !== s.y || final.width !== s.width || final.height !== s.height;
        if (changed) {
          // Restore to start so ResizeNodeCommand captures the correct old geometry, then commit.
          node.x = s.x; node.y = s.y; node.width = s.width; node.height = s.height;
          this.#state.resizeNode(this.#nodeId, final);
        }
      }
    }

    this.#activeHandle = null;
    this.#reposition();
  }

  #computeGeom(handle: HandlePos, dx: number, dy: number): NodeGeometry {
    const s = this.#startGeom;
    let x = s.x;
    let y = s.y;
    let width = s.width;
    let height = s.height;

    const east = handle.includes('e');
    const west = handle.includes('w');
    const south = handle.includes('s');
    const north = handle.includes('n');

    if (east) width = Math.max(this.minWidth, s.width + dx);
    if (west) {
      width = Math.max(this.minWidth, s.width - dx);
      x = s.x + (s.width - width); // keep the right edge anchored
    }
    if (south) height = Math.max(this.minHeight, s.height + dy);
    if (north) {
      height = Math.max(this.minHeight, s.height - dy);
      y = s.y + (s.height - height); // keep the bottom edge anchored
    }

    if (this.snapGrid) {
      const [gx, gy] = this.snapGrid;
      if (east || west) {
        const snapped = Math.max(this.minWidth, Math.round(width / gx) * gx);
        if (west) x = s.x + (s.width - snapped);
        width = snapped;
      }
      if (north || south) {
        const snapped = Math.max(this.minHeight, Math.round(height / gy) * gy);
        if (north) y = s.y + (s.height - snapped);
        height = snapped;
      }
    }

    return { x, y, width, height };
  }
}
