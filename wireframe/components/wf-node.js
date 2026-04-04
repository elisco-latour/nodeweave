/**
 * <wf-node> — Wireframe-style node component.
 *
 * Wide cards (280px), rounded 12px corners, inline controls,
 * typed color-coded port dots, ⋮ context menu trigger.
 */

const DATA_TYPE_COLORS = {
  number: '#0ea5e9',
  string: '#10b981',
  boolean: '#f59e0b',
  object: '#8b5cf6',
  any: '#64748b',
};

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: block;
    position: absolute;
    width: 280px;
    left: calc(var(--node-x, 0) * 1px);
    top: calc(var(--node-y, 0) * 1px);
    z-index: 20;
    user-select: none;
  }
  :host(:focus-visible) {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
    border-radius: 12px;
  }

  .card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03);
    display: flex;
    flex-direction: column;
    transition: box-shadow 0.2s, border-color 0.2s;
  }
  .card:hover {
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
    border-color: #cbd5e1;
  }
  :host([aria-selected="true"]) .card {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59,130,246,0.3);
  }

  .header {
    padding: 10px 14px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    border-radius: 12px 12px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: grab;
  }
  .header:active { cursor: grabbing; }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 6px;
    color: white;
    font-size: 12px;
  }
  .label {
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
  }
  .menu-btn {
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    font-size: 14px;
    padding: 2px 4px;
    border-radius: 4px;
  }
  .menu-btn:hover { color: #475569; background: #f1f5f9; }

  .body {
    padding: 12px 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .port-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    min-height: 24px;
  }

  .port {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #475569;
    font-weight: 500;
  }
  .port-in { padding-left: 14px; }
  .port-out { padding-right: 14px; flex-direction: row-reverse; }

  .port-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid #ffffff;
    position: absolute;
    cursor: crosshair;
    box-shadow: 0 0 0 1px #cbd5e1;
    transition: transform 0.1s, box-shadow 0.1s;
  }
  .port-dot:hover {
    transform: scale(1.3);
    box-shadow: 0 0 0 2px #ffffff, 0 0 0 3px currentColor;
  }
  .port-in .port-dot { left: -6px; }
  .port-out .port-dot { right: -6px; }

  .spacer { flex: 1; }
</style>

<div class="card">
  <div class="header" part="header">
    <div class="header-left">
      <div class="icon"><slot name="icon">?</slot></div>
      <span class="label"><slot name="label">Node</slot></span>
    </div>
    <button class="menu-btn" aria-label="Node menu">&#8942;</button>
  </div>
  <div class="body" id="body"></div>
</div>
`;

export class WfNode extends HTMLElement {
  #nodeId = '';
  #nodeType = '';
  #ports = [];
  #visualDef = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  set nodeId(id) { this.#nodeId = id; }
  get nodeId() { return this.#nodeId; }

  set nodeType(type) { this.#nodeType = type; }
  get nodeType() { return this.#nodeType; }

  set visualDef(def) {
    this.#visualDef = def;
    if (def) {
      const icon = this.shadowRoot.querySelector('.icon');
      icon.style.background = def.color;
      const labelSlot = this.shadowRoot.querySelector('.label');
      labelSlot.textContent = def.label;
    }
  }

  set ports(portDefs) {
    this.#ports = portDefs;
    this.#renderPorts();
  }

  setPosition(x, y) {
    this.style.setProperty('--node-x', x);
    this.style.setProperty('--node-y', y);
  }

  #renderPorts() {
    const body = this.shadowRoot.getElementById('body');
    body.innerHTML = '';

    // Group by row — match inputs and outputs at the same index
    const inputs = this.#ports.filter(p => p.direction === 'in');
    const outputs = this.#ports.filter(p => p.direction === 'out');
    const rows = Math.max(inputs.length, outputs.length);

    for (let i = 0; i < rows; i++) {
      const row = document.createElement('div');
      row.classList.add('port-row');

      if (inputs[i]) {
        row.appendChild(this.#createPortEl(inputs[i], 'in'));
      } else {
        const spacer = document.createElement('div');
        spacer.classList.add('spacer');
        row.appendChild(spacer);
      }

      if (outputs[i]) {
        row.appendChild(this.#createPortEl(outputs[i], 'out'));
      }

      body.appendChild(row);
    }
  }

  #createPortEl(portDef, direction) {
    const port = document.createElement('div');
    port.classList.add('port', `port-${direction}`);

    const dot = document.createElement('div');
    dot.classList.add('port-dot');
    dot.id = portDef.id;
    const dataType = portDef.dataType || 'any';
    const color = DATA_TYPE_COLORS[dataType] || DATA_TYPE_COLORS.any;
    dot.style.backgroundColor = color;
    dot.style.color = color;
    dot.setAttribute('role', 'button');
    dot.setAttribute('aria-label', `${portDef.label} port`);
    dot.setAttribute('tabindex', '0');

    const label = document.createElement('span');
    label.textContent = portDef.label;
    label.style.color = color;

    port.appendChild(dot);
    port.appendChild(label);
    return port;
  }
}

customElements.define('wf-node', WfNode);
