# Phase 4 — Schema-Driven Configuration Engine

**Depends on:** Phase 2 (can run in parallel with Phase 3)

**Agents:** `domain-engineer`, `component-engineer`, `test-engineer`

**Skills:** `schema-driven-forms`, `web-components`, `accessibility`, `vanilla-js-conventions`

---

## Task 4.1 — Implement `RuleEvaluator` — leaf conditions

Create `lib/core/rule-evaluator.js`.

`RuleEvaluator`:
- Static method `evaluate(rule, state)` — evaluates a single rule against a state object
- Leaf condition format: `{ field, operator, value }`
- Supported operators:
  - `'equals'` — `state[field] === value`
  - `'notEquals'` — `state[field] !== value`
  - `'in'` — `value.includes(state[field])`
  - `'notIn'` — `!value.includes(state[field])`
  - `'exists'` — `state[field] !== undefined && state[field] !== null && state[field] !== ''`
  - `'notExists'` — inverse of `exists`
- Unknown operator throws

**Agent:** `domain-engineer`

**Skills:** `schema-driven-forms`

**Acceptance:**
- All 6 operators evaluate correctly
- Unknown operator throws descriptive error
- Missing field in state treated as `undefined`

---

## Task 4.2 — Implement `RuleEvaluator` — recursive `$and` / `$or`

Extend `RuleEvaluator.evaluate()`:
- If rule has `$and` key: `rule.$and.every(sub => evaluate(sub, state))`
- If rule has `$or` key: `rule.$or.some(sub => evaluate(sub, state))`
- `$and` and `$or` can nest arbitrarily deep
- A rule with neither `$and`/`$or` nor `field`/`operator` throws

**Agent:** `domain-engineer`

**Acceptance:**
- Nested `$and` inside `$or` evaluates correctly
- Short-circuit behavior: `$and` stops on first false, `$or` stops on first true

---

## Task 4.3 — Unit tests for `RuleEvaluator`

Create `tests/unit/rule-evaluator.test.js`.

Test cases:
- Each leaf operator with matching and non-matching state
- `$and` with all true, one false
- `$or` with all false, one true
- Nested: `$and` containing `$or` containing leaf
- Empty `$and` array returns true (vacuous truth)
- Empty `$or` array returns false
- Invalid rule (no recognized keys) throws
- Missing field in state

**Agent:** `test-engineer`

**Acceptance:**
- `node --test tests/unit/rule-evaluator.test.js` — all pass

---

## Task 4.4 — Implement `<config-drawer>` shell

Create `lib/components/config-drawer.js`.

`<config-drawer>` (extends `HTMLElement`):
- Registers as custom element `'config-drawer'`
- Shadow DOM with:
  - `:host { position: fixed; right: 0; top: 0; height: 100%; width: 320px; transform: translateX(100%); transition: transform 0.2s; }` (hidden by default)
  - `:host([open]) { transform: translateX(0); }` (visible when open)
  - A `<header>` with node type label and a close button
  - A `<div id="form-container">` for dynamic form content
  - `role="complementary"`, `aria-label="Node configuration"`
- Methods: `open(nodeId, nodeType, config)`, `close()`
- `open()` sets the `open` attribute and calls form rendering
- `close()` removes the `open` attribute

**Agent:** `component-engineer`

**Skills:** `web-components`, `accessibility`

**Acceptance:**
- Drawer hidden by default, slides in on `open()`
- Close button works
- ARIA attributes present

---

## Task 4.5 — Implement form field factory — text, number, select

Add to `<config-drawer>`:
- Private method `_createField(fieldKey, fieldDef, currentValue)` — returns a `<div class="form-group">` containing a `<label>` and the appropriate input element
- `type: 'string'` → `<input type="text">`
- `type: 'number'` → `<input type="number">`
- `type: 'select'` → `<select>` with `<option>` elements from `fieldDef.options`
- Set `id`, `name`, `placeholder`, default value
- Associate label via `for` attribute

**Agent:** `component-engineer`

**Skills:** `schema-driven-forms`

**Acceptance:**
- Each type generates the correct HTML element
- Labels properly associated with inputs

---

## Task 4.6 — Implement form field factory — textarea, boolean, list

Extend `_createField()`:
- `type: 'textarea'` → `<textarea>` with optional `rows` from fieldDef
- `type: 'boolean'` → `<input type="checkbox">` with label positioned after
- `type: 'list'` → a container `<div>` with an "+ Add" button. Each list item is a group of fields rendered recursively from `fieldDef.itemSchema`. A "Remove" button per item.

**Agent:** `component-engineer`

**Skills:** `schema-driven-forms`

**Acceptance:**
- All 3 types generate correct HTML
- List type supports adding/removing items dynamically
- "List" field renders nested fields per item

---

## Task 4.7 — Implement `renderForm()` with `DocumentFragment`

Add to `<config-drawer>`:
- Method `renderForm(schema, currentConfig)`:
  - Creates a `DocumentFragment`
  - Iterates schema entries, calls `_createField()` for each
  - Stores references to all field wrapper `<div>`s in `this._fieldElements` Map
  - Stores current values in `this._localState` object
  - Appends fragment to `#form-container` in one DOM operation
  - Attaches `input`/`change` event listeners to every field

**Agent:** `component-engineer`

**Acceptance:**
- Form renders in a single DOM append (no incremental inserts)
- `_localState` reflects current field values
- `_fieldElements` holds references to all form groups

---

## Task 4.8 — Implement conditional visibility (`showIf`)

Add to `<config-drawer>`:
- Method `_evaluateConditions(schema)`:
  - Iterates all fields in schema
  - For fields with `showIf`, calls `RuleEvaluator.evaluate(field.showIf, this._localState)`
  - Sets `hidden` attribute on the field's wrapper `<div>` based on result
  - Adds `aria-live="polite"` on conditional fields so screen readers announce appearance
- Call `_evaluateConditions()` on initial render and on every `input`/`change` event

**Agent:** `component-engineer`

**Skills:** `schema-driven-forms`, `accessibility`

**Acceptance:**
- Changing a `select` from `GET` to `POST` reveals a hidden `textarea`
- Changing back to `GET` hides it
- Hidden field's data is NOT deleted from `_localState`

---

## Task 4.9 — Implement config event dispatch

Add to `<config-drawer>`:
- On every `input`/`change` event:
  - Update `_localState[fieldKey]` with new value
  - Run `_evaluateConditions()`
  - Dispatch `CustomEvent('node-config-updated', { detail: { nodeId, config: { ...this._localState } }, bubbles: true, composed: true })`

**Agent:** `component-engineer`

**Acceptance:**
- Parent elements can listen for `'node-config-updated'` events
- Event contains the full current config state
- Event pierces Shadow DOM (`composed: true`)

---

## Task 4.10 — Wire `<config-drawer>` to `CanvasState`

The `<config-drawer>` needs to react to node selection and update the `CanvasState` when the user edits config.

Wire in the consuming context (will be used by `<canvas-workspace>` or `<app-shell>`):
- Listen to `CanvasState` `'selection-changed'` event
- If exactly 1 node selected: call `drawer.open(nodeId, nodeType, currentConfig)` using data from `CanvasState` and `SchemaRegistry`
- If 0 or 2+ nodes selected: call `drawer.close()`
- Listen to `'node-config-updated'` from drawer: update node metadata in `CanvasState`

Add a `UpdateNodeConfigCommand` to `CanvasState`:
- `execute()` — sets new config, dispatches `'node-config-updated'`
- `undo()` — restores old config, dispatches `'node-config-updated'`

**Agent:** `domain-engineer` + `component-engineer`

**Acceptance:**
- Selecting a node opens drawer with correct form
- Editing a field updates node config in CanvasState
- Config change is undoable

---

## Task 4.11 — Playwright component test: `<config-drawer>`

Create `tests/component/config-drawer.spec.js`.

Test cases:
- Mount drawer, call `open()` with a schema containing 4 fields — assert all 4 rendered
- Change a `select` value triggering `showIf` — assert hidden field appears
- Change back — assert field hides but data retained in emitted event
- Type into a text field — assert `'node-config-updated'` event fired with correct data
- Open with existing config values — assert fields pre-populated
- List field: click "+ Add", assert new row appears; click "Remove", assert row removed

**Agent:** `test-engineer`

**Skills:** `playwright-testing`, `schema-driven-forms`

**Acceptance:**
- `pnpm exec playwright test tests/component/config-drawer.spec.js` — all pass

---

## Task 4.12 — Update `lib/index.js`

Add new exports:
- `RuleEvaluator` from `./core/rule-evaluator.js`
- `'./components/config-drawer.js'` (side-effect import to register element)

**Agent:** `architect`

**Acceptance:**
- `RuleEvaluator` importable from `lib/index.js`
- `<config-drawer>` element registered on import

---

## Phase 4 Completion Checklist

- [ ] `RuleEvaluator` handles all leaf operators + recursive `$and`/`$or`
- [ ] `<config-drawer>` renders schema-driven forms dynamically
- [ ] All field types supported: string, number, select, textarea, boolean, list
- [ ] `showIf` conditionally shows/hides fields without deleting data
- [ ] Config changes dispatch `'node-config-updated'` events
- [ ] `UpdateNodeConfigCommand` makes config edits undoable
- [ ] ARIA: form labels, live regions for conditional fields
- [ ] All unit and component tests pass
- [ ] `lib/index.js` updated
