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
  h2 {
    margin: 0 0 8px 0;
    font-size: 0.8125rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--vc-label-color, #aab);
  }
  .actions {
    display: flex;
    gap: 4px;
    margin-bottom: 8px;
  }
  .actions button {
    flex: 1;
    padding: 6px 8px;
    background: var(--vc-btn-bg, transparent);
    border: 1px solid var(--vc-toolbar-border, #2a3a5e);
    border-radius: var(--radius-sm, 4px);
    color: var(--vc-text-color, #e0e0e0);
    cursor: pointer;
    font-family: inherit;
    font-size: 0.8125rem;
    transition: background 0.15s;
  }
  .actions button:hover {
    background: var(--vc-btn-hover-bg, rgba(255,255,255,0.1));
  }
  .actions button:focus-visible {
    outline: 2px solid var(--vc-focus-ring-color, #4dabf7);
    outline-offset: 2px;
  }
  .pipeline-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px;
    margin-bottom: 4px;
    border-radius: var(--radius-sm, 4px);
    background: var(--vc-input-bg, #1a1a2e);
    border: 1px solid var(--vc-input-border, #2a3a5e);
  }
  .pipeline-info {
    flex: 1;
    min-width: 0;
  }
  .pipeline-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .pipeline-date {
    font-size: 0.75rem;
    color: var(--vc-label-color, #aab);
  }
  .pipeline-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }
  .pipeline-actions button {
    padding: 2px 6px;
    background: var(--vc-btn-bg, transparent);
    border: 1px solid var(--vc-toolbar-border, #2a3a5e);
    border-radius: var(--radius-sm, 4px);
    color: var(--vc-text-color, #e0e0e0);
    cursor: pointer;
    font-size: 0.75rem;
    font-family: inherit;
    transition: background 0.15s;
  }
  .pipeline-actions button:hover {
    background: var(--vc-btn-hover-bg, rgba(255,255,255,0.1));
  }
  .pipeline-actions button:focus-visible {
    outline: 2px solid var(--vc-focus-ring-color, #4dabf7);
    outline-offset: 2px;
  }
  .pipeline-actions .btn-delete:hover {
    background: rgba(244,67,54,0.2);
  }
  .empty {
    color: var(--vc-label-color, #aab);
    font-style: italic;
    padding: 8px 0;
  }
</style>
<h2>Pipelines</h2>
<div class="actions">
  <button id="btn-new" aria-label="New pipeline">New</button>
  <button id="btn-save" aria-label="Save pipeline">Save</button>
</div>
<div id="list" role="list" aria-label="Saved pipelines"></div>
`;

export class ProcessList extends HTMLElement {
  #storageService = null;
  #state = null;
  #onStateReset;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.#onStateReset = () => this.#render();

    this.shadowRoot.getElementById('btn-new').addEventListener('click', () => {
      if (this.#state) {
        this.#state.clear();
      }
    });

    this.shadowRoot.getElementById('btn-save').addEventListener('click', () => {
      if (!this.#storageService || !this.#state) return;
      const name = prompt('Pipeline name:');
      if (!name) return;
      this.#storageService.save(name, this.#state);
      this.#render();
    });
  }

  connectedCallback() {
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Saved pipelines');
    this.#render();
  }

  disconnectedCallback() {
    if (this.#state) {
      this.#state.removeEventListener('state-reset', this.#onStateReset);
    }
  }

  set storageService(svc) {
    this.#storageService = svc;
    if (this.isConnected) this.#render();
  }

  set state(s) {
    if (this.#state) {
      this.#state.removeEventListener('state-reset', this.#onStateReset);
    }
    this.#state = s;
    if (this.#state) {
      this.#state.addEventListener('state-reset', this.#onStateReset);
    }
  }

  refresh() {
    this.#render();
  }

  #render() {
    const list = this.shadowRoot.getElementById('list');
    list.textContent = '';

    if (!this.#storageService) return;

    const names = this.#storageService.list();
    if (names.length === 0) {
      const empty = document.createElement('div');
      empty.classList.add('empty');
      empty.setAttribute('role', 'listitem');
      empty.textContent = 'No saved pipelines';
      list.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const name of names) {
      const data = this.#storageService.load(name);
      const item = document.createElement('div');
      item.classList.add('pipeline-item');
      item.setAttribute('role', 'listitem');

      const info = document.createElement('div');
      info.classList.add('pipeline-info');

      const nameEl = document.createElement('div');
      nameEl.classList.add('pipeline-name');
      nameEl.textContent = name;

      const dateEl = document.createElement('div');
      dateEl.classList.add('pipeline-date');
      if (data && data.savedAt) {
        dateEl.textContent = new Date(data.savedAt).toLocaleString();
      }

      info.appendChild(nameEl);
      info.appendChild(dateEl);

      const actions = document.createElement('div');
      actions.classList.add('pipeline-actions');

      const loadBtn = document.createElement('button');
      loadBtn.textContent = 'Load';
      loadBtn.setAttribute('aria-label', `Load pipeline ${name}`);
      loadBtn.addEventListener('click', () => {
        if (!this.#state || !data) return;
        this.#state.loadFromJSON(data);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.classList.add('btn-delete');
      deleteBtn.textContent = 'Delete';
      deleteBtn.setAttribute('aria-label', `Delete pipeline ${name}`);
      deleteBtn.addEventListener('click', () => {
        if (!confirm(`Delete pipeline "${name}"?`)) return;
        this.#storageService.delete(name);
        this.#render();
      });

      actions.appendChild(loadBtn);
      actions.appendChild(deleteBtn);

      item.appendChild(info);
      item.appendChild(actions);
      fragment.appendChild(item);
    }
    list.appendChild(fragment);
  }
}

customElements.define('process-list', ProcessList);
