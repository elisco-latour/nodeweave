import { Edge } from '../core/graph.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export class EdgeRoutingController {
  #workspace;
  #state;
  #edgeLayer;
  #nodeSelector;
  #portSelector;
  #isRouting = false;
  #sourcePortId = null;
  #sourceNodeId = null;
  #phantomPath = null;
  #sourcePos = null;

  #onPointerDown;
  #onPointerMove;
  #onPointerUp;
  #onKeyDown;

  constructor(workspace, canvasState, edgeLayer, selectors) {
    if (!selectors?.node || !selectors?.port) {
      throw new Error('EdgeRoutingController requires selectors with node and port properties');
    }
    this.#workspace = workspace;
    this.#state = canvasState;
    this.#edgeLayer = edgeLayer;
    this.#nodeSelector = selectors.node;
    this.#portSelector = selectors.port;

    this.#onPointerDown = (e) => this.#handlePointerDown(e);
    this.#onPointerMove = (e) => this.#handlePointerMove(e);
    this.#onPointerUp = (e) => this.#handlePointerUp(e);
    this.#onKeyDown = (e) => this.#handleKeyDown(e);
  }

  get isRouting() { return this.#isRouting; }

  attach() {
    this.#workspace.addEventListener('pointerdown', this.#onPointerDown);
  }

  detach() {
    this.#workspace.removeEventListener('pointerdown', this.#onPointerDown);
    document.removeEventListener('pointermove', this.#onPointerMove);
    document.removeEventListener('pointerup', this.#onPointerUp);
    document.removeEventListener('keydown', this.#onKeyDown);
    this.#cancel();
  }

  #findInComposedPath(path, selector) {
    for (const el of path) {
      if (el.matches?.(selector)) return el;
    }
    return null;
  }

  #handlePointerDown(e) {
    if (e.button !== 0) return;

    // Find port element in composed path
    const portEl = this.#findInComposedPath(e.composedPath(), this.#portSelector);
    if (!portEl) return;
    if (portEl.direction !== 'out') return;

    e.stopPropagation();
    e.preventDefault();

    this.#sourcePortId = portEl.portId;
    this.#sourceNodeId = portEl.nodeId;
    this.#isRouting = true;

    // Get source port position from edge layer
    this.#sourcePos = this.#edgeLayer._getPortPosition(this.#sourcePortId);
    if (!this.#sourcePos) {
      this.#cancel();
      return;
    }

    // Create phantom SVG path
    this.#createPhantomPath();

    document.addEventListener('pointermove', this.#onPointerMove);
    document.addEventListener('pointerup', this.#onPointerUp);
    document.addEventListener('keydown', this.#onKeyDown);
  }

  #handlePointerMove(e) {
    if (!this.#isRouting) return;

    // Convert mouse position to canvas coordinates
    const { panX, panY, zoom } = this.#state.viewport;
    const wsRect = this.#workspace.getBoundingClientRect();
    const canvasX = (e.clientX - wsRect.left - panX) / zoom;
    const canvasY = (e.clientY - wsRect.top - panY) / zoom;

    // Update phantom path endpoint
    this.#updatePhantomPath(canvasX, canvasY);

    // Highlight valid target ports
    this.#highlightValidTargets(e);
  }

  #handlePointerUp(e) {
    if (!this.#isRouting) return;

    // Check if we dropped on a valid input port
    const portEl = this.#findInComposedPath(e.composedPath(), this.#portSelector);

    if (portEl && portEl.direction === 'in' && portEl.nodeId !== this.#sourceNodeId) {
      const edgeId = `edge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      try {
        this.#state.addEdge(new Edge({
          id: edgeId,
          sourcePortId: this.#sourcePortId,
          targetPortId: portEl.portId,
        }));
      } catch {
        // Cycle or validation error — silently cancel
      }
    }

    this.#cancel();
  }

  #handleKeyDown(e) {
    if (e.key === 'Escape') {
      this.#cancel();
    }
  }

  #createPhantomPath() {
    const svg = this.#edgeLayer.shadowRoot.querySelector('svg');
    if (!svg) return;

    this.#phantomPath = document.createElementNS(SVG_NS, 'path');
    this.#phantomPath.classList.add('phantom');
    this.#phantomPath.setAttribute('d',
      `M ${this.#sourcePos.x},${this.#sourcePos.y} L ${this.#sourcePos.x},${this.#sourcePos.y}`);
    svg.appendChild(this.#phantomPath);
  }

  #updatePhantomPath(targetX, targetY) {
    if (!this.#phantomPath || !this.#sourcePos) return;

    const sx = this.#sourcePos.x;
    const sy = this.#sourcePos.y;
    const dx = Math.abs(targetX - sx);
    const offset = Math.min(dx * 0.5, 150);

    const d = `M ${sx},${sy} C ${sx + offset},${sy} ${targetX - offset},${targetY} ${targetX},${targetY}`;
    this.#phantomPath.setAttribute('d', d);
  }

  #getAllPorts() {
    const ports = [];
    const nodeEls = this.#workspace.shadowRoot
      ? this.#workspace.shadowRoot.querySelectorAll(this.#nodeSelector)
      : this.#workspace.querySelectorAll(this.#nodeSelector);
    for (const node of nodeEls) {
      const nodePorts = node.shadowRoot
        ? node.shadowRoot.querySelectorAll(this.#portSelector)
        : node.querySelectorAll(this.#portSelector);
      for (const p of nodePorts) ports.push(p);
    }
    return ports;
  }

  #highlightValidTargets(e) {
    // Clear previous highlights
    const allPorts = this.#getAllPorts();
    for (const port of allPorts) {
      port.removeAttribute('data-valid-target');
    }

    // Highlight compatible input ports (different node)
    for (const port of allPorts) {
      if (port.direction === 'in' && port.nodeId !== this.#sourceNodeId) {
        port.setAttribute('data-valid-target', '');
      }
    }
  }

  #clearHighlights() {
    const allPorts = this.#getAllPorts();
    for (const port of allPorts) {
      port.removeAttribute('data-valid-target');
    }
  }

  #cancel() {
    if (this.#phantomPath) {
      this.#phantomPath.remove();
      this.#phantomPath = null;
    }
    this.#clearHighlights();
    this.#isRouting = false;
    this.#sourcePortId = null;
    this.#sourceNodeId = null;
    this.#sourcePos = null;

    document.removeEventListener('pointermove', this.#onPointerMove);
    document.removeEventListener('pointerup', this.#onPointerUp);
    document.removeEventListener('keydown', this.#onKeyDown);
  }
}
