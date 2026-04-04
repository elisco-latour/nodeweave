const CLICK_THRESHOLD = 3;

export class SelectionController {
  #workspace;
  #state;
  #isRubberBand = false;
  #rubberBandEl = null;
  #startX = 0;
  #startY = 0;
  #pointerStartX = 0;
  #pointerStartY = 0;

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
    this.#state.addEventListener('selection-changed', this.#onSelectionChanged);
  }

  detach() {
    this.#workspace.removeEventListener('pointerdown', this.#onPointerDown);
    document.removeEventListener('pointermove', this.#onPointerMove);
    document.removeEventListener('pointerup', this.#onPointerUp);
    this.#state.removeEventListener('selection-changed', this.#onSelectionChanged);
    this.#removeRubberBand();
  }

  #getNodeElements() {
    return this.#workspace.shadowRoot
      ? this.#workspace.shadowRoot.querySelectorAll('canvas-node')
      : this.#workspace.querySelectorAll('canvas-node');
  }

  #onSelectionChanged = (e) => {
    const selectedIds = e.detail.selectedIds;
    const nodes = this.#getNodeElements();
    for (const el of nodes) {
      if (selectedIds.has(el.nodeId)) {
        el.setAttribute('data-selected', '');
      } else {
        el.removeAttribute('data-selected');
      }
    }
  };

  #findInComposedPath(path, tagName) {
    for (const el of path) {
      if (el.tagName?.toLowerCase() === tagName) return el;
    }
    return null;
  }

  #handlePointerDown(e) {
    if (e.button !== 0) return;

    const path = e.composedPath();

    // Don't handle if it's a port click
    if (this.#findInComposedPath(path, 'canvas-port')) return;

    this.#pointerStartX = e.clientX;
    this.#pointerStartY = e.clientY;

    // Check if clicking on a node
    const nodeEl = this.#findInComposedPath(path, 'canvas-node');
    if (nodeEl) {
      // Selection on pointerup if no drag occurred (handled in pointerup)
      document.addEventListener('pointerup', this.#onPointerUp, { once: true });
      return;
    }

    // Clicking on workspace background — start rubber-band
    this.#startX = e.clientX;
    this.#startY = e.clientY;

    document.addEventListener('pointermove', this.#onPointerMove);
    document.addEventListener('pointerup', this.#onPointerUp);
  }

  #handlePointerMove(e) {
    const dx = Math.abs(e.clientX - this.#startX);
    const dy = Math.abs(e.clientY - this.#startY);

    if (!this.#isRubberBand && (dx > CLICK_THRESHOLD || dy > CLICK_THRESHOLD)) {
      this.#isRubberBand = true;
      this.#createRubberBand();
    }

    if (this.#isRubberBand) {
      this.#updateRubberBand(e.clientX, e.clientY);
    }
  }

  #handlePointerUp(e) {
    document.removeEventListener('pointermove', this.#onPointerMove);
    document.removeEventListener('pointerup', this.#onPointerUp);

    if (this.#isRubberBand) {
      this.#completeRubberBand(e);
      this.#isRubberBand = false;
      return;
    }

    // Check if this was a click (not a drag)
    const dx = Math.abs(e.clientX - this.#pointerStartX);
    const dy = Math.abs(e.clientY - this.#pointerStartY);
    if (dx >= CLICK_THRESHOLD || dy >= CLICK_THRESHOLD) return;

    // Click selection
    const path = e.composedPath();
    const nodeEl = this.#findInComposedPath(path, 'canvas-node');

    if (nodeEl) {
      const nodeId = nodeEl.nodeId;
      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl) {
        this.#state.toggleNodeSelection(nodeId);
      } else {
        this.#state.selectNode(nodeId);
      }
    } else {
      this.#state.clearSelection();
    }
  }

  #createRubberBand() {
    this.#rubberBandEl = document.createElement('div');
    Object.assign(this.#rubberBandEl.style, {
      position: 'fixed',
      border: '1px dashed var(--vc-selection-border, #4dabf7)',
      background: 'var(--vc-selection-bg, rgba(77, 171, 247, 0.1))',
      pointerEvents: 'none',
      zIndex: '9999',
    });
    document.body.appendChild(this.#rubberBandEl);
  }

  #updateRubberBand(currentX, currentY) {
    if (!this.#rubberBandEl) return;
    const left = Math.min(this.#startX, currentX);
    const top = Math.min(this.#startY, currentY);
    const width = Math.abs(currentX - this.#startX);
    const height = Math.abs(currentY - this.#startY);
    Object.assign(this.#rubberBandEl.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    });
  }

  #completeRubberBand(e) {
    const rect = {
      left: Math.min(this.#startX, e.clientX),
      top: Math.min(this.#startY, e.clientY),
      right: Math.max(this.#startX, e.clientX),
      bottom: Math.max(this.#startY, e.clientY),
    };

    // Convert screen rect to canvas coordinates
    const { panX, panY, zoom } = this.#state.viewport;
    const wsRect = this.#workspace.getBoundingClientRect();

    const canvasRect = {
      left: (rect.left - wsRect.left - panX) / zoom,
      top: (rect.top - wsRect.top - panY) / zoom,
      right: (rect.right - wsRect.left - panX) / zoom,
      bottom: (rect.bottom - wsRect.top - panY) / zoom,
    };

    // Find all nodes intersecting the rectangle
    const intersecting = [];
    for (const node of this.#state.nodes.values()) {
      const nodeRight = node.x + node.width;
      const nodeBottom = node.y + node.height;
      if (
        node.x < canvasRect.right &&
        nodeRight > canvasRect.left &&
        node.y < canvasRect.bottom &&
        nodeBottom > canvasRect.top
      ) {
        intersecting.push(node.id);
      }
    }

    this.#state.selectNodes(intersecting);
    this.#removeRubberBand();
  }

  #removeRubberBand() {
    if (this.#rubberBandEl) {
      this.#rubberBandEl.remove();
      this.#rubberBandEl = null;
    }
  }
}
