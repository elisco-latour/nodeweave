const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--vc-port-color, #888);
    border: 2px solid var(--vc-port-border-color, #555);
    cursor: pointer;
    box-sizing: border-box;
  }
  :host(:hover) {
    background: var(--vc-port-hover-color, #4dabf7);
    border-color: var(--vc-port-hover-border-color, #339af0);
  }
  :host(:focus-visible) {
    outline: 2px solid var(--vc-focus-ring-color, #4dabf7);
    outline-offset: 2px;
  }
</style>
`;

export class CanvasPort extends HTMLElement {
  #portId = '';
  #direction = 'in';
  #nodeId = '';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '0');
    this.#updateAriaLabel();
  }

  get portId() { return this.#portId; }
  set portId(value) {
    this.#portId = value;
    this.#updateAriaLabel();
  }

  get direction() { return this.#direction; }
  set direction(value) {
    this.#direction = value;
    this.#updateAriaLabel();
  }

  get nodeId() { return this.#nodeId; }
  set nodeId(value) { this.#nodeId = value; }

  #updateAriaLabel() {
    if (this.#direction === 'in') {
      this.setAttribute('aria-label', `Connect to ${this.#portId} input`);
    } else {
      this.setAttribute('aria-label', `Drag from ${this.#portId} output`);
    }
  }
}

customElements.define('canvas-port', CanvasPort);
