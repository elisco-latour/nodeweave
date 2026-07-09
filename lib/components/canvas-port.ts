import type { PortDirection } from '../types.js';

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
  #direction: PortDirection = 'in';
  #nodeId = '';

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '0');
    this.#updateAriaLabel();
  }

  get portId(): string { return this.#portId; }
  set portId(value: string) {
    this.#portId = value;
    this.#updateAriaLabel();
  }

  get direction(): PortDirection { return this.#direction; }
  set direction(value: PortDirection) {
    this.#direction = value;
    this.#updateAriaLabel();
  }

  get nodeId(): string { return this.#nodeId; }
  set nodeId(value: string) { this.#nodeId = value; }

  #updateAriaLabel(): void {
    if (this.#direction === 'in') {
      this.setAttribute('aria-label', `Connect to ${this.#portId} input`);
    } else {
      this.setAttribute('aria-label', `Drag from ${this.#portId} output`);
    }
  }
}

customElements.define('canvas-port', CanvasPort);
