const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: block;
    padding: var(--space-sm, 8px);
    font-family: var(--vc-font-family, system-ui, -apple-system, sans-serif);
    font-size: var(--vc-font-size, 0.875rem);
    color: var(--vc-text-color, #e0e0e0);
  }
  :host(:focus-visible) {
    outline: 2px solid var(--vc-focus-ring-color, #4dabf7);
    outline-offset: 2px;
  }
  h2 {
    margin: 0 0 8px 0;
    font-size: 0.8125rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--vc-label-color, #aab);
  }
  .palette-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    margin-bottom: 4px;
    border-radius: var(--radius-sm, 4px);
    cursor: grab;
    user-select: none;
    border: 1px solid transparent;
    background: transparent;
    transition: background 0.15s;
  }
  .palette-item:hover {
    background: var(--vc-btn-hover-bg, rgba(255,255,255,0.1));
  }
  .palette-item:focus-visible {
    outline: 2px solid var(--vc-focus-ring-color, #4dabf7);
    outline-offset: 2px;
  }
  .palette-item:active {
    cursor: grabbing;
  }
  .color-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .label {
    flex: 1;
  }
</style>
<h2>Components</h2>
<div id="list" role="list" aria-label="Available node types"></div>
`;

export class ComponentPalette extends HTMLElement {
  #visualRegistry = null;
  #topologyRegistry = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Available node types');
    this.#render();
  }

  set visualRegistry(reg) {
    this.#visualRegistry = reg;
    if (this.isConnected) this.#render();
  }

  set topologyRegistry(reg) {
    this.#topologyRegistry = reg;
    if (this.isConnected) this.#render();
  }

  #render() {
    if (!this.#visualRegistry) return;
    const list = this.shadowRoot.getElementById('list');
    list.textContent = '';
    const fragment = document.createDocumentFragment();

    for (const [nodeType, visual] of this.#visualRegistry.getAll()) {
      const item = document.createElement('div');
      item.classList.add('palette-item');
      item.setAttribute('role', 'listitem');
      item.setAttribute('tabindex', '0');
      item.setAttribute('draggable', 'true');
      item.setAttribute('aria-label', visual.label);
      item.dataset.nodeType = nodeType;

      const dot = document.createElement('span');
      dot.classList.add('color-dot');
      dot.style.background = visual.color;

      const label = document.createElement('span');
      label.classList.add('label');
      label.textContent = visual.label;

      item.appendChild(dot);
      item.appendChild(label);

      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('application/x-node-type', nodeType);
        e.dataTransfer.effectAllowed = 'copy';
      });

      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.dispatchEvent(new CustomEvent('palette-add-node', {
            detail: { nodeType },
            bubbles: true,
            composed: true,
          }));
        }
      });

      fragment.appendChild(item);
    }

    list.appendChild(fragment);
  }
}

customElements.define('component-palette', ComponentPalette);
