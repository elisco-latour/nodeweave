import { Edge } from '../core/graph.js';
import type { CanvasState } from '../core/canvas-state.js';
import type { ControllerOptions } from '../types.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

interface PortElement extends Element {
  portId?: string;
  nodeId?: string;
  direction?: string;
}

interface EdgeLayerElement extends HTMLElement {
  _getPortPosition(portId: string): { x: number; y: number } | null;
}

export class EdgeRoutingController {
  readonly #workspace: HTMLElement;
  readonly #state: CanvasState;
  readonly #edgeLayer: EdgeLayerElement;
  readonly #nodeSelector: string;
  readonly #portSelector: string;
  readonly #options: ControllerOptions;
  #isRouting = false;
  #sourcePortId: string | null = null;
  #sourceNodeId: string | null = null;
  #phantomPath: SVGPathElement | null = null;
  #sourcePos: { x: number; y: number } | null = null;

  readonly #onPointerDown: (e: PointerEvent) => void;
  readonly #onPointerMove: (e: PointerEvent) => void;
  readonly #onPointerUp: (e: PointerEvent) => void;
  readonly #onKeyDown: (e: KeyboardEvent) => void;

  constructor(workspace: HTMLElement, canvasState: CanvasState, edgeLayer: HTMLElement, options: ControllerOptions) {
    if (!options?.nodeSelector || !options?.portSelector) {
      throw new Error('EdgeRoutingController requires options with nodeSelector and portSelector');
    }
    this.#workspace = workspace;
    this.#state = canvasState;
    this.#edgeLayer = edgeLayer as EdgeLayerElement;
    this.#nodeSelector = options.nodeSelector;
    this.#portSelector = options.portSelector;
    this.#options = options;

    this.#onPointerDown = (e) => this.#handlePointerDown(e);
    this.#onPointerMove = (e) => this.#handlePointerMove(e);
    this.#onPointerUp = (e) => this.#handlePointerUp(e);
    this.#onKeyDown = (e) => this.#handleKeyDown(e);
  }

  get isRouting(): boolean { return this.#isRouting; }

  attach(): void {
    this.#workspace.addEventListener('pointerdown', this.#onPointerDown as EventListener);
  }

  detach(): void {
    this.#workspace.removeEventListener('pointerdown', this.#onPointerDown as EventListener);
    document.removeEventListener('pointermove', this.#onPointerMove);
    document.removeEventListener('pointerup', this.#onPointerUp);
    document.removeEventListener('keydown', this.#onKeyDown);
    this.#cancel();
  }

  #findInComposedPath(path: EventTarget[], selector: string): PortElement | null {
    for (const el of path) {
      if ((el as Element).matches?.(selector)) return el as PortElement;
    }
    return null;
  }

  #handlePointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    const portEl = this.#findInComposedPath(e.composedPath(), this.#portSelector);
    if (!portEl || portEl.direction !== 'out') return;

    e.stopPropagation();
    e.preventDefault();

    this.#sourcePortId = portEl.portId ?? null;
    this.#sourceNodeId = portEl.nodeId ?? null;
    this.#isRouting = true;

    this.#sourcePos = this.#edgeLayer._getPortPosition(this.#sourcePortId!);
    if (!this.#sourcePos) { this.#cancel(); return; }

    this.#createPhantomPath();
    document.addEventListener('pointermove', this.#onPointerMove);
    document.addEventListener('pointerup', this.#onPointerUp);
    document.addEventListener('keydown', this.#onKeyDown);
  }

  #handlePointerMove(e: PointerEvent): void {
    if (!this.#isRouting) return;
    const { panX, panY, zoom } = this.#state.viewport;
    const wsRect = this.#workspace.getBoundingClientRect();
    const canvasX = (e.clientX - wsRect.left - panX) / zoom;
    const canvasY = (e.clientY - wsRect.top - panY) / zoom;
    this.#updatePhantomPath(canvasX, canvasY);
    this.#highlightValidTargets();
  }

  #handlePointerUp(e: PointerEvent): void {
    if (!this.#isRouting) return;
    const portEl = this.#findInComposedPath(e.composedPath(), this.#portSelector);

    if (portEl && portEl.direction === 'in' && portEl.nodeId !== this.#sourceNodeId) {
      const targetPortId = portEl.portId!;
      const sourcePortId = this.#sourcePortId!;

      const validator = this.#options.isValidConnection;
      const allowed = !validator || validator(sourcePortId, targetPortId);

      if (allowed) {
        const edgeId = `edge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        try {
          this.#state.addEdge(new Edge({ id: edgeId, sourcePortId, targetPortId }));
          this.#options.onConnect?.(sourcePortId, targetPortId);
        } catch {
          // Cycle or validation error — silently cancel
        }
      }
    }

    this.#cancel();
  }

  #handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') this.#cancel();
  }

  #createPhantomPath(): void {
    const svg = (this.#edgeLayer.shadowRoot ?? this.#edgeLayer).querySelector('svg');
    if (!svg) return;
    this.#phantomPath = document.createElementNS(SVG_NS, 'path');
    this.#phantomPath.classList.add('phantom');
    this.#phantomPath.setAttribute('d',
      `M ${this.#sourcePos!.x},${this.#sourcePos!.y} L ${this.#sourcePos!.x},${this.#sourcePos!.y}`);
    svg.appendChild(this.#phantomPath);
  }

  #updatePhantomPath(targetX: number, targetY: number): void {
    if (!this.#phantomPath || !this.#sourcePos) return;
    const sx = this.#sourcePos.x;
    const sy = this.#sourcePos.y;
    const offset = Math.min(Math.abs(targetX - sx) * 0.5, 150);
    this.#phantomPath.setAttribute('d',
      `M ${sx},${sy} C ${sx + offset},${sy} ${targetX - offset},${targetY} ${targetX},${targetY}`);
  }

  #getAllPorts(): PortElement[] {
    const ports: PortElement[] = [];
    const nodeEls = this.#workspace.shadowRoot
      ? this.#workspace.shadowRoot.querySelectorAll(this.#nodeSelector)
      : this.#workspace.querySelectorAll(this.#nodeSelector);
    for (const node of nodeEls) {
      const root = (node as HTMLElement).shadowRoot ?? node;
      for (const p of root.querySelectorAll(this.#portSelector)) {
        ports.push(p as PortElement);
      }
    }
    return ports;
  }

  #highlightValidTargets(): void {
    for (const port of this.#getAllPorts()) {
      if (port.direction === 'in' && port.nodeId !== this.#sourceNodeId) {
        port.setAttribute('data-valid-target', '');
      } else {
        port.removeAttribute('data-valid-target');
      }
    }
  }

  #clearHighlights(): void {
    for (const port of this.#getAllPorts()) port.removeAttribute('data-valid-target');
  }

  #cancel(): void {
    this.#phantomPath?.remove();
    this.#phantomPath = null;
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
