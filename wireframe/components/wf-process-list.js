/**
 * <wf-process-list> — Floating pipeline management panel for the wireframe editor.
 *
 * Positioned top-left as a small floating card. Provides New / Save / Load / Delete
 * operations using wireframe/services/storage-service.js.
 * Lists saved pipelines, highlights the active one.
 */

import { StorageService } from '../services/storage-service.js';

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: block;
    width: 220px;
    background: rgba(255,255,255,0.95);
    backdrop-filter: blur(8px);
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    font-size: 0.8125rem;
    color: #0f172a;
    z-index: 50;
    overflow: hidden;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid #e2e8f0;
    background: #f8fafc;
  }
  .header h3 {
    margin: 0;
    font-size: 0.8125rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: #475569;
  }

  .actions {
    display: flex;
    gap: 4px;
    padding: 8px 12px;
    border-bottom: 1px solid #f1f5f9;
  }
  .actions button {
    flex: 1;
    padding: 6px 8px;
    background: transparent;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    color: #475569;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.75rem;
    font-weight: 500;
    transition: background 0.15s;
  }
  .actions button:hover {
    background: #f1f5f9;
    color: #0f172a;
  }
  .actions button:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  #list {
    max-height: 200px;
    overflow-y: auto;
    padding: 4px 8px 8px;
  }

  .pipeline-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px;
    margin-bottom: 2px;
    border-radius: 6px;
    background: transparent;
    transition: background 0.15s;
    cursor: default;
  }
  .pipeline-item:hover {
    background: #f1f5f9;
  }
  .pipeline-item[aria-current="true"] {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
  }

  .pipeline-name {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.8125rem;
    color: #0f172a;
  }

  .pipeline-actions {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
  }
  .pipeline-actions button {
    padding: 2px 6px;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: #64748b;
    cursor: pointer;
    font-size: 0.6875rem;
    font-family: inherit;
    transition: background 0.15s, color 0.15s;
  }
  .pipeline-actions button:hover {
    background: #f1f5f9;
    color: #0f172a;
  }
  .pipeline-actions button:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
  .pipeline-actions .btn-delete:hover {
    background: #fef2f2;
    color: #dc2626;
  }

  .empty {
    color: #94a3b8;
    font-style: italic;
    padding: 8px 4px;
    font-size: 0.75rem;
  }
</style>

<div class="header">
  <h3>Pipelines</h3>
</div>
<div class="actions">
  <button id="btn-new" aria-label="New pipeline">New</button>
  <button id="btn-save" aria-label="Save pipeline">Save</button>
</div>
<div id="list" role="list" aria-label="Saved pipelines"></div>
`;

export class WfProcessList extends HTMLElement {
  #storageService = null;
  #state = null;
  #activeName = null;
  #onStateReset;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.#onStateReset = () => {
      this.#activeName = null;
      this.#render();
    };

    this.shadowRoot.getElementById('btn-new').addEventListener('click', () => {
      if (this.#state) {
        this.#state.clear();
        this.#activeName = null;
        this.#render();
      }
    });

    this.shadowRoot.getElementById('btn-save').addEventListener('click', () => {
      if (!this.#storageService || !this.#state) return;
      const name = prompt('Pipeline name:');
      if (!name) return;
      this.#storageService.save(name, this.#state.toJSON());
      this.#activeName = name;
      this.#render();
    });
  }

  connectedCallback() {
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Pipeline management');
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
      const item = document.createElement('div');
      item.classList.add('pipeline-item');
      item.setAttribute('role', 'listitem');
      if (name === this.#activeName) {
        item.setAttribute('aria-current', 'true');
      }

      const nameEl = document.createElement('span');
      nameEl.classList.add('pipeline-name');
      nameEl.textContent = name;

      const actions = document.createElement('div');
      actions.classList.add('pipeline-actions');

      const loadBtn = document.createElement('button');
      loadBtn.textContent = 'Load';
      loadBtn.setAttribute('aria-label', `Load pipeline ${name}`);
      loadBtn.addEventListener('click', () => {
        if (!this.#state || !this.#storageService) return;
        const data = this.#storageService.load(name);
        if (data) {
          this.#state.loadFromJSON(data);
          this.#activeName = name;
          this.#render();
        }
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.classList.add('btn-delete');
      deleteBtn.textContent = 'Del';
      deleteBtn.setAttribute('aria-label', `Delete pipeline ${name}`);
      deleteBtn.addEventListener('click', () => {
        this.#storageService.remove(name);
        if (this.#activeName === name) this.#activeName = null;
        this.#render();
      });

      actions.appendChild(loadBtn);
      actions.appendChild(deleteBtn);

      item.appendChild(nameEl);
      item.appendChild(actions);
      fragment.appendChild(item);
    }
    list.appendChild(fragment);
  }
}

customElements.define('wf-process-list', WfProcessList);
