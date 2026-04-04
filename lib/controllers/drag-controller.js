const DRAG_THRESHOLD = 3;

export class DragController {
  #workspace;
  #state;
  #isDragging = false;
  #draggedNodeId = null;
  #startX = 0;
  #startY = 0;
  #offsetX = 0;
  #offsetY = 0;
  #rafId = null;
  #pendingX = 0;
  #pendingY = 0;
  #hasMoved = false;
  #draggedNodeStartPositions = new Map();

  #pointerId = null;

  #onPointerDown;
  #onPointerMove;
  #onPointerUp;

  constructor(workspace, canvasState) {
    this.#workspace = workspace;
    this.#state = canvasState;

    this.#onPointerDown = (e) => this.#handlePointerDown(e);
    this.#onPointerMove = (e) => this.#handlePointerMove(e);
    this.#onPointerUp = (e) => this.#handlePointerUp(e);
  }

  attach() {
    this.#workspace.addEventListener('pointerdown', this.#onPointerDown);
  }

  detach() {
    this.#workspace.removeEventListener('pointerdown', this.#onPointerDown);
    this.#workspace.removeEventListener('pointermove', this.#onPointerMove);
    this.#workspace.removeEventListener('pointerup', this.#onPointerUp);
    if (this.#rafId !== null) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
  }

  get isDragging() { return this.#isDragging; }

  #findInComposedPath(composedPath, tagName) {
    for (const el of composedPath) {
      if (el.tagName?.toLowerCase() === tagName) return el;
    }
    return null;
  }

  #handlePointerDown(e) {
    if (e.button !== 0) return;

    const path = e.composedPath();

    // Don't drag if clicking on a port
    if (this.#findInComposedPath(path, 'canvas-port')) return;

    const nodeEl = this.#findInComposedPath(path, 'canvas-node');
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
    this.#workspace.addEventListener('pointermove', this.#onPointerMove);
    this.#workspace.addEventListener('pointerup', this.#onPointerUp);
  }

  #handlePointerMove(e) {
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
      for (const [id, start] of this.#draggedNodeStartPositions) {
        const node = this.#state.nodes.get(id);
        if (node && (node.x !== start.x || node.y !== start.y)) {
          // Restore to original position first so MoveNodeCommand captures correct oldX/oldY
          const finalX = node.x;
          const finalY = node.y;
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
      ? this.#workspace.shadowRoot.querySelectorAll('canvas-node')
      : this.#workspace.querySelectorAll('canvas-node');
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
