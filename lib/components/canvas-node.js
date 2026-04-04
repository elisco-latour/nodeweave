import './canvas-port.js';

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
  #nodeId = '';
  #nodeType = '';
  #label = '';
  #ports = [];
  #state = null;
  #onNodeMoved;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.#onNodeMoved = (e) => {
      if (e.detail.nodeId === this.#nodeId) {
        this.setPosition(e.detail.x, e.detail.y);
      }
    };
  }

  connectedCallback() {
    this.setAttribute('role', 'treeitem');
    this.setAttribute('tabindex', '0');
    this.setAttribute('aria-grabbed', 'false');
    this.setAttribute('aria-roledescription', 'graph node');
    this.#updateAriaLabel();
  }

  disconnectedCallback() {
    if (this.#state) {
      this.#state.removeEventListener('node-moved', this.#onNodeMoved);
    }
  }

  get nodeId() { return this.#nodeId; }
  set nodeId(value) { this.#nodeId = value; }

  get nodeType() { return this.#nodeType; }
  set nodeType(value) { this.#nodeType = value; }

  get label() { return this.#label; }
  set label(value) {
    this.#label = value;
    this.shadowRoot.querySelector('.label').textContent = value;
    this.#updateAriaLabel();
  }

  get ports() { return this.#ports; }
  set ports(portArray) {
    this.#ports = portArray;
    this.#renderPorts();
  }

  get state() { return this.#state; }
  set state(canvasState) {
    if (this.#state) {
      this.#state.removeEventListener('node-moved', this.#onNodeMoved);
    }
    this.#state = canvasState;
    if (this.#state) {
      this.#state.addEventListener('node-moved', this.#onNodeMoved);
    }
  }

  setPosition(x, y) {
    this.style.setProperty('--x', x);
    this.style.setProperty('--y', y);
  }

  setHeaderColor(color) {
    this.shadowRoot.querySelector('.header').style.setProperty('--header-color', color);
  }

  #updateAriaLabel() {
    if (this.#label) {
      this.setAttribute('aria-label', `${this.#label} node`);
    }
  }

  #renderPorts() {
    const portsIn = this.shadowRoot.querySelector('.ports-in');
    const portsOut = this.shadowRoot.querySelector('.ports-out');
    portsIn.innerHTML = '';
    portsOut.innerHTML = '';

    const fragIn = document.createDocumentFragment();
    const fragOut = document.createDocumentFragment();

    for (const port of this.#ports) {
      const el = document.createElement('canvas-port');
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
