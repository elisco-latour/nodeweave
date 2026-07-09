import { RuleEvaluator } from '../core/rule-evaluator.js';
import type { SchemaDefinition, SchemaField } from '../types.js';

interface DrawerConfig extends Record<string, unknown> {
  _schema?: SchemaDefinition;
}

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
    transition: transform 0.2s;
    background: var(--vc-drawer-bg, #16213e);
    color: var(--vc-text-color, #e0e0e0);
    font-family: var(--vc-font-family, system-ui, -apple-system, sans-serif);
    font-size: var(--vc-font-size, 0.875rem);
    border-left: 1px solid var(--vc-drawer-border, #2a3a5e);
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
    padding: 12px 16px;
    border-bottom: 1px solid var(--vc-drawer-border, #2a3a5e);
  }
  .drawer-header h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }
  .drawer-header button {
    background: none;
    border: none;
    color: var(--vc-text-color, #e0e0e0);
    cursor: pointer;
    font-size: 1.25rem;
    padding: 4px 8px;
    border-radius: 4px;
  }
  .drawer-header button:hover {
    background: var(--vc-drawer-hover, rgba(255,255,255,0.1));
  }
  #form-container {
    padding: 16px;
  }
  .form-group {
    margin-bottom: 12px;
  }
  .form-group[hidden] {
    display: none;
  }
  .form-group label {
    display: block;
    margin-bottom: 4px;
    font-weight: 500;
    font-size: 0.8125rem;
    color: var(--vc-label-color, #aab);
  }
  .form-group input[type="text"],
  .form-group input[type="number"],
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 6px 8px;
    background: var(--vc-input-bg, #1a1a2e);
    color: var(--vc-text-color, #e0e0e0);
    border: 1px solid var(--vc-input-border, #2a3a5e);
    border-radius: 4px;
    font-family: inherit;
    font-size: inherit;
    box-sizing: border-box;
  }
  .form-group input[type="text"]:focus,
  .form-group input[type="number"]:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: 2px solid var(--vc-focus-ring-color, #4dabf7);
    outline-offset: -1px;
  }
  .checkbox-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .checkbox-group label {
    margin-bottom: 0;
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
    padding: 8px;
    background: var(--vc-input-bg, #1a1a2e);
    border-radius: 4px;
    border: 1px solid var(--vc-input-border, #2a3a5e);
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
    padding: 4px 6px;
    background: var(--vc-drawer-bg, #16213e);
    color: var(--vc-text-color, #e0e0e0);
    border: 1px solid var(--vc-input-border, #2a3a5e);
    border-radius: 3px;
    font-family: inherit;
    font-size: inherit;
    box-sizing: border-box;
  }
  .btn-remove, .btn-add {
    background: none;
    border: 1px solid var(--vc-input-border, #2a3a5e);
    color: var(--vc-text-color, #e0e0e0);
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.8125rem;
  }
  .btn-remove:hover {
    background: var(--vc-error-bg, rgba(244,67,54,0.2));
    border-color: var(--vc-error-color, #f44336);
  }
  .btn-add {
    align-self: flex-start;
  }
  .btn-add:hover {
    background: var(--vc-drawer-hover, rgba(255,255,255,0.1));
  }
</style>
<div class="drawer-header">
  <h2 id="type-label">Configuration</h2>
  <button id="close-btn" aria-label="Close configuration drawer">&times;</button>
</div>
<div id="form-container"></div>
`;

export class ConfigDrawer extends HTMLElement {
  readonly #root: ShadowRoot;
  #nodeId: string | null = null;
  #nodeType: string | null = null;
  #schema: SchemaDefinition | null = null;
  #localState: Record<string, any> = {};
  readonly #fieldElements: Map<string, HTMLElement> = new Map();

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
    this.#root.appendChild(template.content.cloneNode(true));
    this.#root.getElementById('close-btn')!.addEventListener('click', () => this.close());
  }

  connectedCallback(): void {
    this.setAttribute('role', 'complementary');
    this.setAttribute('aria-label', 'Node configuration');
  }

  open(nodeId: string, nodeType: string, config?: DrawerConfig | null): void {
    this.#nodeId = nodeId;
    this.#nodeType = nodeType;
    this.#root.getElementById('type-label')!.textContent = nodeType;
    this.setAttribute('open', '');
    if (config && config._schema) {
      this.renderForm(config._schema, config);
    }
  }

  close(): void {
    this.removeAttribute('open');
    this.#nodeId = null;
    this.#nodeType = null;
    this.#schema = null;
  }

  renderForm(schema: SchemaDefinition, currentConfig: Record<string, unknown> = {}): void {
    this.#schema = schema;
    this.#localState = {};
    this.#fieldElements.clear();
    const container = this.#root.getElementById('form-container')!;
    container.textContent = '';

    const fragment = document.createDocumentFragment();

    for (const [key, fieldDef] of Object.entries(schema.fields)) {
      const value = currentConfig[key] !== undefined ? currentConfig[key] : fieldDef.default;
      this.#localState[key] = value !== undefined
        ? value
        : (fieldDef.type === 'boolean' ? false : (fieldDef.type === 'list' ? [] : ''));
      const group = this.#createField(key, fieldDef, this.#localState[key]);
      this.#fieldElements.set(key, group);
      fragment.appendChild(group);
    }

    container.appendChild(fragment);
    this.#evaluateConditions();
  }

  #createField(fieldKey: string, fieldDef: SchemaField, currentValue: unknown): HTMLElement {
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

  #createStringField(group: HTMLElement, key: string, def: SchemaField, value: unknown): void {
    const label = document.createElement('label');
    label.setAttribute('for', `field-${key}`);
    label.textContent = def.label || key;
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `field-${key}`;
    input.name = key;
    input.value = String(value ?? '');
    if (def.placeholder) input.placeholder = def.placeholder;
    input.addEventListener('input', () => this.#onFieldChange(key, input.value));
    group.appendChild(label);
    group.appendChild(input);
  }

  #createNumberField(group: HTMLElement, key: string, def: SchemaField, value: unknown): void {
    const label = document.createElement('label');
    label.setAttribute('for', `field-${key}`);
    label.textContent = def.label || key;
    const input = document.createElement('input');
    input.type = 'number';
    input.id = `field-${key}`;
    input.name = key;
    input.value = value != null ? String(value) : '';
    if (def.min !== undefined) input.min = String(def.min);
    if (def.max !== undefined) input.max = String(def.max);
    if (def.step !== undefined) input.step = String(def.step);
    if (def.placeholder) input.placeholder = def.placeholder;
    input.addEventListener('input', () => this.#onFieldChange(key, input.valueAsNumber));
    group.appendChild(label);
    group.appendChild(input);
  }

  #createSelectField(group: HTMLElement, key: string, def: SchemaField, value: unknown): void {
    const label = document.createElement('label');
    label.setAttribute('for', `field-${key}`);
    label.textContent = def.label || key;
    const select = document.createElement('select');
    select.id = `field-${key}`;
    select.name = key;
    for (const opt of def.options ?? []) {
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

  #createTextareaField(group: HTMLElement, key: string, def: SchemaField, value: unknown): void {
    const label = document.createElement('label');
    label.setAttribute('for', `field-${key}`);
    label.textContent = def.label || key;
    const textarea = document.createElement('textarea');
    textarea.id = `field-${key}`;
    textarea.name = key;
    textarea.value = String(value ?? '');
    if (def.rows) textarea.rows = def.rows;
    if (def.placeholder) textarea.placeholder = def.placeholder;
    textarea.addEventListener('input', () => this.#onFieldChange(key, textarea.value));
    group.appendChild(label);
    group.appendChild(textarea);
  }

  #createBooleanField(group: HTMLElement, key: string, def: SchemaField, value: unknown): void {
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

  #createListField(group: HTMLElement, key: string, def: SchemaField, value: unknown): void {
    const label = document.createElement('label');
    label.textContent = def.label || key;
    group.appendChild(label);

    const listContainer = document.createElement('div');
    listContainer.classList.add('list-container');
    listContainer.dataset.listKey = key;

    const itemSchema = def.itemSchema ?? {};
    const items: Record<string, unknown>[] = Array.isArray(value) ? value : [];
    this.#localState[key] = items;

    for (let i = 0; i < items.length; i++) {
      listContainer.appendChild(this.#createListItem(key, itemSchema, items[i], i));
    }

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.classList.add('btn-add');
    addBtn.textContent = '+ Add';
    addBtn.addEventListener('click', () => {
      const newItem: Record<string, unknown> = {};
      for (const subKey of Object.keys(itemSchema)) {
        newItem[subKey] = itemSchema[subKey].default ?? '';
      }
      this.#localState[key].push(newItem);
      const itemEl = this.#createListItem(key, itemSchema, newItem, this.#localState[key].length - 1);
      listContainer.appendChild(itemEl);
      this.#dispatchConfigEvent();
    });

    group.appendChild(listContainer);
    group.appendChild(addBtn);
  }

  #createListItem(
    listKey: string,
    itemSchema: Record<string, SchemaField>,
    itemData: Record<string, unknown>,
    index: number,
  ): HTMLElement {
    const itemEl = document.createElement('div');
    itemEl.classList.add('list-item');
    itemEl.dataset.index = String(index);

    const fieldsContainer = document.createElement('div');
    fieldsContainer.classList.add('item-fields');

    for (const [subKey, subDef] of Object.entries(itemSchema)) {
      const fieldDiv = document.createElement('div');
      fieldDiv.classList.add('item-field');
      const label = document.createElement('label');
      label.textContent = subDef.label || subKey;
      const input = document.createElement('input');
      input.type = subDef.type === 'number' ? 'number' : 'text';
      input.value = String(itemData[subKey] ?? '');
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
      const arr = this.#localState[listKey] as unknown[];
      const idx = arr.indexOf(itemData);
      if (idx !== -1) arr.splice(idx, 1);
      itemEl.remove();
      this.#dispatchConfigEvent();
    });

    itemEl.appendChild(fieldsContainer);
    itemEl.appendChild(removeBtn);
    return itemEl;
  }

  #onFieldChange(key: string, value: unknown): void {
    this.#localState[key] = value;
    this.#evaluateConditions();
    this.#dispatchConfigEvent();
  }

  #evaluateConditions(): void {
    if (!this.#schema) return;
    for (const [key, fieldDef] of Object.entries(this.#schema.fields)) {
      if (!fieldDef.showIf) continue;
      const group = this.#fieldElements.get(key);
      if (!group) continue;
      const visible = RuleEvaluator.evaluate(fieldDef.showIf, this.#localState);
      group.toggleAttribute('hidden', !visible);
    }
  }

  #dispatchConfigEvent(): void {
    this.dispatchEvent(new CustomEvent('node-config-updated', {
      detail: { nodeId: this.#nodeId, config: { ...this.#localState } },
      bubbles: true,
      composed: true,
    }));
  }
}

customElements.define('config-drawer', ConfigDrawer);
