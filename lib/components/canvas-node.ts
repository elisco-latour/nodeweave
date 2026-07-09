import './canvas-port.js';
import type { CanvasPort } from './canvas-port.js';
import type { CanvasState } from '../core/canvas-state.js';
import type { Port } from '../core/graph.js';

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: block;
    position: absolute;
    transform: translate(calc(var(--x, 0) * 1px), calc(var(--y, 0) * 1px));
    min-width: 160px;
    background: var(--vc-node-bg, #16213e);
    border: 1px solid var(--vc-node-border, #2a3a5e);
    border-radius: var(--vc-node-radius, 8px);
    overflow: hidden;
    user-select: none;
    color: var(--vc-text-color, #e0e0e0);
    font-family: var(--vc-font-family, system-ui, -apple-system, sans-serif);
    font-size: var(--vc-font-size, 0.875rem);
  }
  :host(:focus-visible) {
    outline: 2px solid var(--vc-focus-ring-color, #4dabf7);
    outline-offset: 2px;
  }
  .header {
    height: 6px;
    background: var(--header-color, #888);
  }
  .label {
    padding: 8px 12px;
    font-weight: 500;
  }
  .body {
    display: flex;
    justify-content: space-between;
    padding: 0 8px 8px;
  }
  .ports {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .ports-in {
    align-items: flex-start;
  }
  .ports-out {
    align-items: flex-end;
  }
</style>
<div class="header"></div>
<div class="label"></div>
<div class="body">
  <div class="ports ports-in"></div>
  <div class="ports ports-out"></div>
</div>
`;

export class CanvasNode extends HTMLElement {
  readonly #root: ShadowRoot;
  #nodeId = '';
  #nodeKind = '';
  #label = '';
  #ports: Port[] = [];
  #state: CanvasState | null = null;
  readonly #onNodeMoved: (e: Event) => void;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
    this.#root.appendChild(template.content.cloneNode(true));

    this.#onNodeMoved = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.nodeId === this.#nodeId) {
        this.setPosition(detail.x, detail.y);
      }
    };
  }

  connectedCallback(): void {
    this.setAttribute('role', 'treeitem');
    this.setAttribute('tabindex', '0');
    this.setAttribute('aria-grabbed', 'false');
    this.setAttribute('aria-roledescription', 'graph node');
    this.#updateAriaLabel();
  }

  disconnectedCallback(): void {
    if (this.#state) {
      this.#state.removeEventListener('node-moved', this.#onNodeMoved);
    }
  }

  get nodeId(): string { return this.#nodeId; }
  set nodeId(value: string) { this.#nodeId = value; }

  get nodeKind(): string { return this.#nodeKind; }
  set nodeKind(value: string) { this.#nodeKind = value; }

  get label(): string { return this.#label; }
  set label(value: string) {
    this.#label = value;
    const labelEl = this.#root.querySelector('.label');
    if (labelEl) labelEl.textContent = value;
    this.#updateAriaLabel();
  }

  get ports(): Port[] { return this.#ports; }
  set ports(portArray: Port[]) {
    this.#ports = portArray;
    this.#renderPorts();
  }

  get state(): CanvasState | null { return this.#state; }
  set state(canvasState: CanvasState | null) {
    if (this.#state) {
      this.#state.removeEventListener('node-moved', this.#onNodeMoved);
    }
    this.#state = canvasState;
    if (this.#state) {
      this.#state.addEventListener('node-moved', this.#onNodeMoved);
    }
  }

  setPosition(x: number, y: number): void {
    this.style.setProperty('--x', String(x));
    this.style.setProperty('--y', String(y));
  }

  setHeaderColor(color: string): void {
    const header = this.#root.querySelector('.header') as HTMLElement | null;
    header?.style.setProperty('--header-color', color);
  }

  #updateAriaLabel(): void {
    if (this.#label) {
      this.setAttribute('aria-label', `${this.#label} node`);
    }
  }

  #renderPorts(): void {
    const portsIn = this.#root.querySelector('.ports-in')!;
    const portsOut = this.#root.querySelector('.ports-out')!;
    portsIn.innerHTML = '';
    portsOut.innerHTML = '';

    const fragIn = document.createDocumentFragment();
    const fragOut = document.createDocumentFragment();

    for (const port of this.#ports) {
      const el = document.createElement('canvas-port') as CanvasPort;
      el.portId = port.id;
      el.direction = port.direction;
      el.nodeId = port.nodeId;
      if (port.direction === 'in') {
        fragIn.appendChild(el);
      } else {
        fragOut.appendChild(el);
      }
    }

    portsIn.appendChild(fragIn);
    portsOut.appendChild(fragOut);
  }
}

customElements.define('canvas-node', CanvasNode);
