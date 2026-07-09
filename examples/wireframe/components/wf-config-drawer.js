/**
 * <wf-config-drawer> — Light-theme schema-driven config drawer.
 *
 * Slides in from the right. Renders form fields from WfSchemaRegistry
 * schemas. Uses RuleEvaluator for conditional visibility.
 * Dispatches `node-config-updated` CustomEvent on input changes.
 */

import { RuleEvaluator } from '/packages/core/dist/core/rule-evaluator.js';

const template = document.createElement('template');
template.innerHTML = `
<style>
  :host {
    display: block;
    position: fixed;
    right: 0;
    top: 0;
    height: 100%;
    width: 320px;
    transform: translateX(100%);
    transition: transform 0.25s ease;
    background: var(--wf-bg-surface, #ffffff);
    color: var(--wf-text, #0f172a);
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    font-size: 0.875rem;
    border-left: 1px solid var(--wf-border, #e2e8f0);
    box-shadow: -4px 0 12px var(--wf-shadow, rgba(0,0,0,0.05));
    box-sizing: border-box;
    overflow-y: auto;
    z-index: 100;
  }
  :host([open]) {
    transform: translateX(0);
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid var(--wf-border, #e2e8f0);
    background: var(--wf-bg-elevated, #f8fafc);
  }
  .drawer-header h2 {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--wf-text, #0f172a);
  }
  .drawer-header button {
    background: none;
    border: none;
    color: var(--wf-text-secondary, #64748b);
    cursor: pointer;
    font-size: 1.25rem;
    padding: 4px 8px;
    border-radius: 6px;
    line-height: 1;
  }
  .drawer-header button:hover {
    background: var(--wf-hover-bg, #f1f5f9);
    color: var(--wf-text, #0f172a);
  }
  .drawer-header button:focus-visible {
    outline: 2px solid var(--wf-focus-ring, #3b82f6);
    outline-offset: 2px;
  }

  #form-container {
    padding: 16px;
  }

  .form-group {
    margin-bottom: 14px;
  }
  .form-group[hidden] {
    display: none;
  }
  .form-group label {
    display: block;
    margin-bottom: 4px;
    font-weight: 500;
    font-size: 0.8125rem;
    color: var(--wf-text-secondary, #64748b);
  }

  .form-group input[type="text"],
  .form-group input[type="number"],
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 8px 10px;
    background: var(--wf-input-bg, #ffffff);
    color: var(--wf-text, #0f172a);
    border: 1px solid var(--wf-input-border, #cbd5e1);
    border-radius: 8px;
    font-family: inherit;
    font-size: inherit;
    box-sizing: border-box;
    transition: border-color 0.15s;
  }
  .form-group input[type="text"]:focus,
  .form-group input[type="number"]:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: var(--wf-focus-ring, #3b82f6);
    box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
  }

  .checkbox-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .checkbox-group label {
    margin-bottom: 0;
    color: var(--wf-text, #0f172a);
  }

  .list-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .list-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px;
    background: var(--wf-bg-elevated, #f8fafc);
    border-radius: 8px;
    border: 1px solid var(--wf-border, #e2e8f0);
  }
  .list-item .item-fields {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .list-item .item-field label {
    font-size: 0.75rem;
  }
  .list-item .item-field input {
    width: 100%;
    padding: 6px 8px;
    background: var(--wf-input-bg, #ffffff);
    color: var(--wf-text, #0f172a);
    border: 1px solid var(--wf-input-border, #cbd5e1);
    border-radius: 6px;
    font-family: inherit;
    font-size: inherit;
    box-sizing: border-box;
  }
  .list-item .item-field input:focus {
    outline: none;
    border-color: var(--wf-focus-ring, #3b82f6);
    box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
  }

  .btn-remove, .btn-add {
    background: none;
    border: 1px solid var(--wf-input-border, #cbd5e1);
    color: var(--wf-text-secondary, #475569);
    cursor: pointer;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 0.8125rem;
    font-family: inherit;
    transition: background 0.15s;
  }
  .btn-remove:hover {
    background: var(--wf-danger-bg, #fef2f2);
    border-color: var(--wf-danger-border, #fca5a5);
    color: var(--wf-danger-text, #dc2626);
  }
  .btn-add {
    align-self: flex-start;
  }
  .btn-add:hover {
    background: var(--wf-hover-bg, #f1f5f9);
  }
</style>
<div class="drawer-header">
  <h2 id="type-label">Configuration</h2>
  <button id="close-btn" aria-label="Close configuration drawer">&times;</button>
</div>
<div id="form-container"></div>
`;

export class WfConfigDrawer extends HTMLElement {
  #nodeId = null;
  #nodeType = null;
  #schema = null;
  #localState = {};
  #fieldElements = new Map();

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.shadowRoot.getElementById('close-btn').addEventListener('click', () => this.close());
  }

  connectedCallback() {
    this.setAttribute('role', 'complementary');
    this.setAttribute('aria-label', 'Node configuration');
  }

  open(nodeId, nodeType, config) {
    this.#nodeId = nodeId;
    this.#nodeType = nodeType;
    this.shadowRoot.getElementById('type-label').textContent = nodeType;
    this.setAttribute('open', '');
    if (config && config._schema) {
      this.renderForm(config._schema, config);
    }
  }

  close() {
    this.removeAttribute('open');
    this.#nodeId = null;
    this.#nodeType = null;
    this.#schema = null;
  }

  renderForm(schema, currentConfig = {}) {
    this.#schema = schema;
    this.#localState = {};
    this.#fieldElements.clear();
    const container = this.shadowRoot.getElementById('form-container');
    container.textContent = '';

    const fragment = document.createDocumentFragment();

    // Support both object-style and array-style field definitions
    const entries = Array.isArray(schema.fields)
      ? schema.fields.map(f => [f.id, f])
      : Object.entries(schema.fields);

    for (const [key, fieldDef] of entries) {
      const value = currentConfig[key] !== undefined ? currentConfig[key] : fieldDef.default;
      this.#localState[key] = value !== undefined ? value : (fieldDef.type === 'boolean' ? false : (fieldDef.type === 'list' ? [] : ''));
      const group = this.#createField(key, fieldDef, this.#localState[key]);
      this.#fieldElements.set(key, group);
      fragment.appendChild(group);
    }

    container.appendChild(fragment);
    this.#evaluateConditions();
  }

  #createField(fieldKey, fieldDef, currentValue) {
    const group = document.createElement('div');
    group.classList.add('form-group');
    group.dataset.fieldKey = fieldKey;

    if (fieldDef.showIf) {
      group.setAttribute('aria-live', 'polite');
    }

    switch (fieldDef.type) {
      case 'string':
        this.#createStringField(group, fieldKey, fieldDef, currentValue);
        break;
      case 'number':
        this.#createNumberField(group, fieldKey, fieldDef, currentValue);
        break;
      case 'select':
        this.#createSelectField(group, fieldKey, fieldDef, currentValue);
        break;
      case 'textarea':
        this.#createTextareaField(group, fieldKey, fieldDef, currentValue);
        break;
      case 'boolean':
        this.#createBooleanField(group, fieldKey, fieldDef, currentValue);
        break;
      case 'list':
        this.#createListField(group, fieldKey, fieldDef, currentValue);
        break;
    }

    return group;
  }

  #createStringField(group, key, def, value) {
    const label = document.createElement('label');
    label.setAttribute('for', `field-${key}`);
    label.textContent = def.label || key;
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `field-${key}`;
    input.name = key;
    input.value = value ?? '';
    if (def.placeholder) input.placeholder = def.placeholder;
    input.addEventListener('input', () => this.#onFieldChange(key, input.value));
    group.appendChild(label);
    group.appendChild(input);
  }

  #createNumberField(group, key, def, value) {
    const label = document.createElement('label');
    label.setAttribute('for', `field-${key}`);
    label.textContent = def.label || key;
    const input = document.createElement('input');
    input.type = 'number';
    input.id = `field-${key}`;
    input.name = key;
    input.value = value ?? '';
    if (def.min !== undefined) input.min = def.min;
    if (def.max !== undefined) input.max = def.max;
    if (def.step !== undefined) input.step = def.step;
    if (def.placeholder) input.placeholder = def.placeholder;
    input.addEventListener('input', () => this.#onFieldChange(key, input.valueAsNumber));
    group.appendChild(label);
    group.appendChild(input);
  }

  #createSelectField(group, key, def, value) {
    const label = document.createElement('label');
    label.setAttribute('for', `field-${key}`);
    label.textContent = def.label || key;
    const select = document.createElement('select');
    select.id = `field-${key}`;
    select.name = key;
    for (const opt of def.options) {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      if (opt === value) option.selected = true;
      select.appendChild(option);
    }
    select.addEventListener('change', () => this.#onFieldChange(key, select.value));
    group.appendChild(label);
    group.appendChild(select);
  }

  #createTextareaField(group, key, def, value) {
    const label = document.createElement('label');
    label.setAttribute('for', `field-${key}`);
    label.textContent = def.label || key;
    const textarea = document.createElement('textarea');
    textarea.id = `field-${key}`;
    textarea.name = key;
    textarea.value = value ?? '';
    if (def.rows) textarea.rows = def.rows;
    if (def.placeholder) textarea.placeholder = def.placeholder;
    textarea.addEventListener('input', () => this.#onFieldChange(key, textarea.value));
    group.appendChild(label);
    group.appendChild(textarea);
  }

  #createBooleanField(group, key, def, value) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('checkbox-group');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `field-${key}`;
    input.name = key;
    input.checked = !!value;
    const label = document.createElement('label');
    label.setAttribute('for', `field-${key}`);
    label.textContent = def.label || key;
    wrapper.appendChild(input);
    wrapper.appendChild(label);
    input.addEventListener('change', () => this.#onFieldChange(key, input.checked));
    group.appendChild(wrapper);
  }

  #createListField(group, key, def, value) {
    const label = document.createElement('label');
    label.textContent = def.label || key;
    group.appendChild(label);

    const listContainer = document.createElement('div');
    listContainer.classList.add('list-container');
    listContainer.dataset.listKey = key;

    const items = Array.isArray(value) ? value : [];
    this.#localState[key] = items;

    for (let i = 0; i < items.length; i++) {
      listContainer.appendChild(this.#createListItem(key, def.itemSchema, items[i], i));
    }

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.classList.add('btn-add');
    addBtn.textContent = '+ Add';
    addBtn.addEventListener('click', () => {
      const newItem = {};
      for (const subKey of Object.keys(def.itemSchema)) {
        newItem[subKey] = def.itemSchema[subKey].default ?? '';
      }
      this.#localState[key].push(newItem);
      const itemEl = this.#createListItem(key, def.itemSchema, newItem, this.#localState[key].length - 1);
      listContainer.appendChild(itemEl);
      this.#dispatchConfigEvent();
    });

    group.appendChild(listContainer);
    group.appendChild(addBtn);
  }

  #createListItem(listKey, itemSchema, itemData, index) {
    const itemEl = document.createElement('div');
    itemEl.classList.add('list-item');
    itemEl.dataset.index = index;

    const fieldsContainer = document.createElement('div');
    fieldsContainer.classList.add('item-fields');

    for (const [subKey, subDef] of Object.entries(itemSchema)) {
      const fieldDiv = document.createElement('div');
      fieldDiv.classList.add('item-field');
      const label = document.createElement('label');
      label.textContent = subDef.label || subKey;
      const input = document.createElement('input');
      input.type = subDef.type === 'number' ? 'number' : 'text';
      input.value = itemData[subKey] ?? '';
      input.addEventListener('input', () => {
        itemData[subKey] = input.value;
        this.#dispatchConfigEvent();
      });
      fieldDiv.appendChild(label);
      fieldDiv.appendChild(input);
      fieldsContainer.appendChild(fieldDiv);
    }

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.classList.add('btn-remove');
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      const arr = this.#localState[listKey];
      const idx = arr.indexOf(itemData);
      if (idx !== -1) arr.splice(idx, 1);
      itemEl.remove();
      this.#dispatchConfigEvent();
    });

    itemEl.appendChild(fieldsContainer);
    itemEl.appendChild(removeBtn);
    return itemEl;
  }

  #onFieldChange(key, value) {
    this.#localState[key] = value;
    this.#evaluateConditions();
    this.#dispatchConfigEvent();
  }

  #evaluateConditions() {
    if (!this.#schema) return;

    const entries = Array.isArray(this.#schema.fields)
      ? this.#schema.fields.map(f => [f.id, f])
      : Object.entries(this.#schema.fields);

    for (const [key, fieldDef] of entries) {
      if (!fieldDef.showIf) continue;
      const group = this.#fieldElements.get(key);
      if (!group) continue;
      const visible = RuleEvaluator.evaluate(fieldDef.showIf, this.#localState);
      group.toggleAttribute('hidden', !visible);
    }
  }

  #dispatchConfigEvent() {
    this.dispatchEvent(new CustomEvent('node-config-updated', {
      detail: { nodeId: this.#nodeId, config: { ...this.#localState } },
      bubbles: true,
      composed: true,
    }));
  }
}

customElements.define('wf-config-drawer', WfConfigDrawer);
