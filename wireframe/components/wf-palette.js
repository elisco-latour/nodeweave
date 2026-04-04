/**
 * <wf-palette> — Floating pill-shaped node palette for the wireframe editor.
 *
 * Positioned at the top center (matching existing wireframe layout).
 * Lists available node types from WfVisualRegistry.
 * Supports HTML5 drag-and-drop via dataTransfer and
 * keyboard: Enter on focused item dispatches `palette-add-node`.
 */

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: flex;
    gap: 4px;
    padding: 6px 8px;
    background: rgba(255,255,255,0.9);
    backdrop-filter: blur(8px);
    border: 1px solid #e2e8f0;
    border-radius: 999px;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    z-index: 50;
  }

  .palette-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 500;
    color: #475569;
    cursor: grab;
    border: none;
    background: transparent;
    user-select: none;
    transition: background 0.2s, color 0.2s;
    font-family: inherit;
  }
  .palette-item:hover {
    background: #f1f5f9;
    color: #0f172a;
  }
  .palette-item:active {
    cursor: grabbing;
  }
  .palette-item:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  .color-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .divider {
    width: 1px;
    background: #e2e8f0;
    margin: 0 4px;
    align-self: stretch;
  }

  .wf-tools-palette{
    display: flex;
  }
</style>
<div class="wf-tools-palette" id="items" role="list" aria-label="Available node types"></div>
`;

export class WfPalette extends HTMLElement {
  #visualRegistry = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.setAttribute('role', 'navigation');
    this.setAttribute('aria-label', 'Node palette');
    this.#render();
  }

  set visualRegistry(reg) {
    this.#visualRegistry = reg;
    if (this.isConnected) this.#render();
  }

  #render() {
    if (!this.#visualRegistry) return;
    const container = this.shadowRoot.getElementById('items');
    container.textContent = '';
    const fragment = document.createDocumentFragment();
    let first = true;

    for (const [nodeType, visual] of this.#visualRegistry.getAll()) {
      if (!first) {
        const divider = document.createElement('div');
        divider.classList.add('divider');
        fragment.appendChild(divider);
      }
      first = false;

      const item = document.createElement('button');
      item.classList.add('palette-item');
      item.setAttribute('role', 'listitem');
      item.setAttribute('tabindex', '0');
      item.setAttribute('draggable', 'true');
      item.setAttribute('aria-label', visual.label);
      item.dataset.nodeType = nodeType;

      const dot = document.createElement('span');
      dot.classList.add('color-dot');
      dot.style.background = visual.color;

      const label = document.createTextNode(visual.label);

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

    container.appendChild(fragment);
  }
}

customElements.define('wf-palette', WfPalette);
