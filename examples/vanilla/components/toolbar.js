const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: flex;
    gap: 4px;
    padding: 6px;
    background: var(--nw-toolbar-bg, #16213e);
    border: 1px solid var(--nw-toolbar-border, #2a3a5e);
    border-radius: var(--radius-md, 8px);
    font-family: var(--nw-font-family, system-ui, -apple-system, sans-serif);
  }
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background: var(--nw-btn-bg, transparent);
    border: 1px solid transparent;
    border-radius: var(--radius-sm, 4px);
    color: var(--nw-text-color, #e0e0e0);
    cursor: pointer;
    transition: background 0.15s;
  }
  button:hover:not(:disabled) {
    background: var(--nw-btn-hover-bg, rgba(255,255,255,0.1));
  }
  button:focus-visible {
    outline: 2px solid var(--nw-focus-ring-color, #4dabf7);
    outline-offset: 2px;
  }
  button:disabled {
    opacity: var(--nw-btn-disabled-opacity, 0.4);
    cursor: not-allowed;
  }
  button svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }
  .separator {
    width: 1px;
    background: var(--nw-toolbar-border, #2a3a5e);
    margin: 2px 4px;
  }
</style>
<button id="btn-undo" aria-label="Undo" title="Undo (Ctrl+Z)">
  <svg viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05 1.04-6.83 2.73L3 8v9h9l-2.83-2.83A7.95 7.95 0 0 1 12.5 12c3.04 0 5.64 1.71 6.96 4.21l1.79-.9A9.96 9.96 0 0 0 12.5 8z"/></svg>
</button>
<button id="btn-redo" aria-label="Redo" title="Redo (Ctrl+Shift+Z)">
  <svg viewBox="0 0 24 24"><path d="M18.33 10.73A9.96 9.96 0 0 0 11.5 8c2.65 0 5.05 1.04 6.83 2.73L21 8v9h-9l2.83-2.83A7.95 7.95 0 0 0 11.5 12c-3.04 0-5.64 1.71-6.96 4.21l-1.79-.9A9.96 9.96 0 0 1 11.5 8z" transform="scale(-1,1) translate(-24,0)"/></svg>
</button>
<div class="separator"></div>
<button id="btn-zoom-in" aria-label="Zoom in" title="Zoom in">
  <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm.5-7H9v2H7v1h2v2h1v-2h2V9h-2z"/></svg>
</button>
<button id="btn-zoom-out" aria-label="Zoom out" title="Zoom out">
  <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM7 9h5v1H7z"/></svg>
</button>
<button id="btn-fit" aria-label="Fit to view" title="Fit to view">
  <svg viewBox="0 0 24 24"><path d="M3 5v4h2V5h4V3H5a2 2 0 0 0-2 2zm2 10H3v4a2 2 0 0 0 2 2h4v-2H5v-4zm14 4h-4v2h4a2 2 0 0 0 2-2v-4h-2v4zm0-16h-4v2h4v4h2V5a2 2 0 0 0-2-2z"/></svg>
</button>
<div class="separator"></div>
<button id="btn-delete" aria-label="Delete selected" title="Delete selected (Delete)">
  <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
</button>
<div class="separator"></div>
<button id="btn-theme" aria-label="Toggle theme" title="Toggle light/dark theme">
  <svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>
</button>
`;

export class Toolbar extends HTMLElement {
  #state = null;
  #commandHistory = null;
  #onHistoryChange;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.#onHistoryChange = () => this.#updateButtons();

    this.shadowRoot.getElementById('btn-undo').addEventListener('click', () => {
      if (this.#commandHistory) this.#commandHistory.undo();
      this.#updateButtons();
    });

    this.shadowRoot.getElementById('btn-redo').addEventListener('click', () => {
      if (this.#commandHistory) this.#commandHistory.redo();
      this.#updateButtons();
    });

    this.shadowRoot.getElementById('btn-zoom-in').addEventListener('click', () => {
      if (!this.#state) return;
      const { panX, panY, zoom } = this.#state.viewport;
      this.#state.setViewport(panX, panY, Math.min(zoom * 1.2, 5));
    });

    this.shadowRoot.getElementById('btn-zoom-out').addEventListener('click', () => {
      if (!this.#state) return;
      const { panX, panY, zoom } = this.#state.viewport;
      this.#state.setViewport(panX, panY, Math.max(zoom / 1.2, 0.1));
    });

    this.shadowRoot.getElementById('btn-fit').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('toolbar-fit-view', {
        bubbles: true,
        composed: true,
      }));
    });

    this.shadowRoot.getElementById('btn-delete').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('toolbar-delete-selected', {
        bubbles: true,
        composed: true,
      }));
    });

    this.shadowRoot.getElementById('btn-theme').addEventListener('click', () => {
      const shell = this.closest('app-shell') || document.querySelector('app-shell');
      if (!shell) return;
      const current = shell.getAttribute('data-theme');
      const next = current === 'light' ? 'dark' : 'light';
      shell.setAttribute('data-theme', next);
      document.documentElement.setAttribute('data-theme', next);
    });
  }

  connectedCallback() {
    this.setAttribute('role', 'toolbar');
    this.setAttribute('aria-label', 'Canvas tools');
    this.#updateButtons();
  }

  disconnectedCallback() {
    if (this.#state) {
      this.#state.removeEventListener('node-added', this.#onHistoryChange);
      this.#state.removeEventListener('node-removed', this.#onHistoryChange);
      this.#state.removeEventListener('edge-added', this.#onHistoryChange);
      this.#state.removeEventListener('edge-removed', this.#onHistoryChange);
      this.#state.removeEventListener('node-moved', this.#onHistoryChange);
      this.#state.removeEventListener('node-config-updated', this.#onHistoryChange);
      this.#state.removeEventListener('state-reset', this.#onHistoryChange);
    }
  }

  set state(s) {
    if (this.#state) {
      this.#state.removeEventListener('node-added', this.#onHistoryChange);
      this.#state.removeEventListener('node-removed', this.#onHistoryChange);
      this.#state.removeEventListener('edge-added', this.#onHistoryChange);
      this.#state.removeEventListener('edge-removed', this.#onHistoryChange);
      this.#state.removeEventListener('node-moved', this.#onHistoryChange);
      this.#state.removeEventListener('node-config-updated', this.#onHistoryChange);
      this.#state.removeEventListener('state-reset', this.#onHistoryChange);
    }
    this.#state = s;
    this.#commandHistory = s ? s.commandHistory : null;
    if (this.#state) {
      this.#state.addEventListener('node-added', this.#onHistoryChange);
      this.#state.addEventListener('node-removed', this.#onHistoryChange);
      this.#state.addEventListener('edge-added', this.#onHistoryChange);
      this.#state.addEventListener('edge-removed', this.#onHistoryChange);
      this.#state.addEventListener('node-moved', this.#onHistoryChange);
      this.#state.addEventListener('node-config-updated', this.#onHistoryChange);
      this.#state.addEventListener('state-reset', this.#onHistoryChange);
    }
    this.#updateButtons();
  }

  #updateButtons() {
    const canUndo = this.#commandHistory ? this.#commandHistory.canUndo : false;
    const canRedo = this.#commandHistory ? this.#commandHistory.canRedo : false;
    this.shadowRoot.getElementById('btn-undo').disabled = !canUndo;
    this.shadowRoot.getElementById('btn-redo').disabled = !canRedo;
  }
}

customElements.define('app-toolbar', Toolbar);
