const MIN_ZOOM = 0.1;
const MAX_ZOOM = 3.0;

export class PanZoomController {
  /** @type {HTMLElement} */ #workspace;
  /** @type {import('../core/canvas-state.js').CanvasState} */ #state;
  /** @type {boolean} */ #isPanning = false;
  /** @type {boolean} */ #spaceHeld = false;
  /** @type {number} */ #panStartX = 0;
  /** @type {number} */ #panStartY = 0;
  /** @type {number} */ #panStartPanX = 0;
  /** @type {number} */ #panStartPanY = 0;
  /** @type {number | null} */ #pointerId = null;

  #onWheel;
  #onPointerDown;
  #onPointerMove;
  #onPointerUp;
  #onKeyDown;
  #onKeyUp;
  #onContextMenu;

  /**
   * @param {HTMLElement} workspace
   * @param {import('../core/canvas-state.js').CanvasState} canvasState
   */
  constructor(workspace, canvasState) {
    this.#workspace = workspace;
    this.#state = canvasState;

    this.#onWheel = (e) => this.#handleWheel(e);
    this.#onPointerDown = (e) => this.#handlePointerDown(e);
    this.#onPointerMove = (e) => this.#handlePointerMove(e);
    this.#onPointerUp = (e) => this.#handlePointerUp(e);
    this.#onKeyDown = (e) => this.#handleKeyDown(e);
    this.#onKeyUp = (e) => this.#handleKeyUp(e);
    this.#onContextMenu = (e) => {
      // Prevent context menu on middle-click
      if (e.button === 1) e.preventDefault();
    };
  }

  /** @returns {void} */
  attach() {
    this.#workspace.addEventListener('wheel', this.#onWheel, { passive: false });
    this.#workspace.addEventListener('pointerdown', this.#onPointerDown);
    this.#workspace.addEventListener('contextmenu', this.#onContextMenu);
    document.addEventListener('keydown', this.#onKeyDown);
    document.addEventListener('keyup', this.#onKeyUp);
  }

  /** @returns {void} */
  detach() {
    this.#workspace.removeEventListener('wheel', this.#onWheel);
    this.#workspace.removeEventListener('pointerdown', this.#onPointerDown);
    this.#workspace.removeEventListener('contextmenu', this.#onContextMenu);
    document.removeEventListener('pointermove', this.#onPointerMove);
    document.removeEventListener('pointerup', this.#onPointerUp);
    document.removeEventListener('keydown', this.#onKeyDown);
    document.removeEventListener('keyup', this.#onKeyUp);
    this.#spaceHeld = false;
    this.#isPanning = false;
  }

  #handleWheel(e) {
    e.preventDefault();

    const { panX, panY, zoom } = this.#state.viewport;

    // Both scroll-wheel zoom and pinch-to-zoom (ctrlKey === true for trackpad pinch)
    const factor = 0.999 ** e.deltaY;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));

    // Zoom toward cursor: keep the point under the cursor fixed
    const rect = this.#workspace.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    const newPanX = cursorX - (cursorX - panX) * (newZoom / zoom);
    const newPanY = cursorY - (cursorY - panY) * (newZoom / zoom);

    this.#state.setViewport(newPanX, newPanY, newZoom);
  }

  #handlePointerDown(e) {
    // Middle mouse button OR space + left-click
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

  #handlePointerMove(e) {
    if (!this.#isPanning) return;

    const dx = e.clientX - this.#panStartX;
    const dy = e.clientY - this.#panStartY;

    const { zoom } = this.#state.viewport;
    this.#state.setViewport(
      this.#panStartPanX + dx,
      this.#panStartPanY + dy,
      zoom,
    );
  }

  #handlePointerUp(e) {
    if (!this.#isPanning) return;

    this.#isPanning = false;
    this.#workspace.releasePointerCapture(this.#pointerId);
    this.#workspace.style.cursor = this.#spaceHeld ? 'grab' : '';
    this.#pointerId = null;

    document.removeEventListener('pointermove', this.#onPointerMove);
    document.removeEventListener('pointerup', this.#onPointerUp);
  }

  #handleKeyDown(e) {
    if (e.code === 'Space' && !e.repeat) {
      this.#spaceHeld = true;
      if (!this.#isPanning) {
        this.#workspace.style.cursor = 'grab';
      }
    }
  }

  #handleKeyUp(e) {
    if (e.code === 'Space') {
      this.#spaceHeld = false;
      if (!this.#isPanning) {
        this.#workspace.style.cursor = '';
      }
    }
  }
}
