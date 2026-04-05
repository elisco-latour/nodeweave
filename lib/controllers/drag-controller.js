const DRAG_THRESHOLD = 3;
const DEFAULT_GRID_SIZE = 20;

/**
 * @typedef {{ node: string, port: string }} DragSelectors
 */

export class DragController {
  /** @type {HTMLElement} */ #workspace;
  /** @type {import('../core/canvas-state.js').CanvasState} */ #state;
  /** @type {string} */ #nodeSelector;
  /** @type {string} */ #portSelector;
  /** @type {boolean} */ #isDragging = false;
  /** @type {string | null} */ #draggedNodeId = null;
  /** @type {number} */ #startX = 0;
  /** @type {number} */ #startY = 0;
  /** @type {number} */ #offsetX = 0;
  /** @type {number} */ #offsetY = 0;
  /** @type {number | null} */ #rafId = null;
  /** @type {number} */ #pendingX = 0;
  /** @type {number} */ #pendingY = 0;
  /** @type {boolean} */ #hasMoved = false;
  /** @type {Map<string, {x: number, y: number}>} */ #draggedNodeStartPositions = new Map();
  /** @type {boolean} */ #shiftHeld = false;

  /** @type {number | null} */ #pointerId = null;

  /** @type {boolean} */
  snapToGrid = false;
  /** @type {number} */
  gridSize = DEFAULT_GRID_SIZE;

  #onPointerDown;
  #onPointerMove;
  #onPointerUp;

  /**
   * @param {HTMLElement} workspace
   * @param {import('../core/canvas-state.js').CanvasState} canvasState
   * @param {DragSelectors} selectors
   */
  constructor(workspace, canvasState, selectors) {
    if (!selectors?.node || !selectors?.port) {
      throw new Error('DragController requires selectors with node and port properties');
    }
    this.#workspace = workspace;
    this.#state = canvasState;
    this.#nodeSelector = selectors.node;
    this.#portSelector = selectors.port;

    this.#onPointerDown = (e) => this.#handlePointerDown(e);
    this.#onPointerMove = (e) => this.#handlePointerMove(e);
    this.#onPointerUp = (e) => this.#handlePointerUp(e);
  }

  #snapValue(v) {
    return Math.round(v / this.gridSize) * this.gridSize;
  }

  /** @returns {void} */
  attach() {
    this.#workspace.addEventListener('pointerdown', this.#onPointerDown);
  }

  /** @returns {void} */
  detach() {
    this.#workspace.removeEventListener('pointerdown', this.#onPointerDown);
    this.#workspace.removeEventListener('pointermove', this.#onPointerMove);
    this.#workspace.removeEventListener('pointerup', this.#onPointerUp);
    if (this.#rafId !== null) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
  }

  /** @returns {boolean} */
  get isDragging() { return this.#isDragging; }

  #findInComposedPath(composedPath, selector) {
    for (const el of composedPath) {
      if (el.matches?.(selector)) return el;
    }
    return null;
  }

  #handlePointerDown(e) {
    if (e.button !== 0) return;

    const path = e.composedPath();

    // Don't drag if clicking on a port
    if (this.#findInComposedPath(path, this.#portSelector)) return;

    const nodeEl = this.#findInComposedPath(path, this.#nodeSelector);
    if (!nodeEl) return;

    const nodeId = nodeEl.nodeId;
    if (!nodeId) return;

    this.#draggedNodeId = nodeId;
    this.#startX = e.clientX;
    this.#startY = e.clientY;
    this.#hasMoved = false;

    // Record start positions for all nodes that will be dragged
    this.#draggedNodeStartPositions.clear();
    const selected = this.#state.selectedNodeIds;
    if (selected.has(nodeId)) {
      for (const id of selected) {
        const node = this.#state.nodes.get(id);
        if (node) {
          this.#draggedNodeStartPositions.set(id, { x: node.x, y: node.y });
        }
      }
    } else {
      const node = this.#state.nodes.get(nodeId);
      if (node) {
        this.#draggedNodeStartPositions.set(nodeId, { x: node.x, y: node.y });
      }
    }

    this.#pointerId = e.pointerId;
    this.#shiftHeld = e.shiftKey;
    this.#workspace.addEventListener('pointermove', this.#onPointerMove);
    this.#workspace.addEventListener('pointerup', this.#onPointerUp);
  }

  #handlePointerMove(e) {
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
    const canvasDx = dx / zoom;
    const canvasDy = dy / zoom;

    this.#pendingX = canvasDx;
    this.#pendingY = canvasDy;

    if (this.#rafId === null) {
      this.#rafId = requestAnimationFrame(() => {
        this.#applyDrag(this.#pendingX, this.#pendingY);
        this.#rafId = null;
      });
    }
  }

  #applyDrag(canvasDx, canvasDy) {
    for (const [id, start] of this.#draggedNodeStartPositions) {
      this.#state.moveNodeDirect(id, start.x + canvasDx, start.y + canvasDy);
    }
  }

  #handlePointerUp(e) {
    this.#workspace.removeEventListener('pointermove', this.#onPointerMove);
    this.#workspace.removeEventListener('pointerup', this.#onPointerUp);

    if (this.#pointerId !== null) {
      this.#pointerId = null;
    }

    if (this.#rafId !== null) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }

    if (this.#isDragging) {
      this.#setAriaGrabbed(false);

      // Commit final positions via CommandHistory
      const positionMap = new Map();
      const shouldSnap = this.snapToGrid || this.#shiftHeld;
      for (const [id, start] of this.#draggedNodeStartPositions) {
        const node = this.#state.nodes.get(id);
        if (node && (node.x !== start.x || node.y !== start.y)) {
          // Restore to original position first so MoveNodeCommand captures correct oldX/oldY
          let finalX = node.x;
          let finalY = node.y;
          if (shouldSnap) {
            finalX = this.#snapValue(finalX);
            finalY = this.#snapValue(finalY);
          }
          node.x = start.x;
          node.y = start.y;
          positionMap.set(id, { x: finalX, y: finalY });
        }
      }

      if (positionMap.size > 0) {
        this.#state.setNodePositions(positionMap);
      }
    }

    this.#isDragging = false;
    this.#draggedNodeId = null;
    this.#draggedNodeStartPositions.clear();
  }

  #getNodeElements() {
    return this.#workspace.shadowRoot
      ? this.#workspace.shadowRoot.querySelectorAll(this.#nodeSelector)
      : this.#workspace.querySelectorAll(this.#nodeSelector);
  }

  #setAriaGrabbed(grabbed) {
    const value = grabbed ? 'true' : 'false';
    const nodes = this.#getNodeElements();
    for (const el of nodes) {
      if (this.#draggedNodeStartPositions.has(el.nodeId)) {
        el.setAttribute('aria-grabbed', value);
      }
    }
  }
}
