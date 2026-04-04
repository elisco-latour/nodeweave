# Phase D: Wireframe UI Components

> Part of [Wireframe Feature Parity plan](plan-wireframeFeatureParity.prompt.md). Depends on Phases B & C. Steps 9–12 are independent and can be built in parallel.

---

## Goal

Build the 4 wireframe UI components that mirror the app's sidebar/toolbar/drawer.

## Steps

### D9. `<wf-config-drawer>`

- Schema-driven form using `RuleEvaluator` from `lib/core/rule-evaluator.js`.
- Light-theme, slide-in from right.
- Dispatches `node-config-updated` CustomEvent.
- Reads schema from `WfSchemaRegistry`.

### D10. `<wf-toolbar>`

- Buttons: Undo / Redo / Zoom In / Zoom Out / Fit / Delete.
- Pill-rounded styling.
- Syncs disabled state with `CommandHistory` (listens to `history-changed`).

### D11. `<wf-palette>`

- Lists available node types from `WfVisualRegistry`.
- Drag-and-drop via HTML5 `dataTransfer` API.
- Keyboard: Enter on focused item → dispatches `palette-add-node` CustomEvent.

### D12. `<wf-process-list>`

- Pipeline management: New / Save / Load / Delete.
- Uses `wireframe/services/storage-service.js`.
- Lists saved pipelines, highlights active one.

### D13. Component tests for wireframe UI components

- **Shared fixture**: `tests/component/fixtures/wf-ui-fixture.html` — imports lib core + all 4 wireframe UI components, sets `window.__ready`.
- **`tests/component/wf-config-drawer.spec.js`**: Render drawer, pass a schema, verify form fields render, verify `node-config-updated` dispatches on input change.
- **`tests/component/wf-toolbar.spec.js`**: Render toolbar, verify 6 buttons present, verify disabled state syncs with `CommandHistory` (start disabled, enable after command execution).
- **`tests/component/wf-palette.spec.js`**: Render palette with registry entries, verify items listed, verify `palette-add-node` dispatches on Enter key.
- **`tests/component/wf-process-list.spec.js`**: Render process list with mocked storage service, verify list renders pipeline names, verify save/load/delete interactions.
- Run: `pnpm exec playwright test tests/component/wf-config-drawer.spec.js tests/component/wf-toolbar.spec.js tests/component/wf-palette.spec.js tests/component/wf-process-list.spec.js`

## Files Created

- `wireframe/components/wf-config-drawer.js`
- `wireframe/components/wf-toolbar.js`
- `wireframe/components/wf-palette.js`
- `wireframe/components/wf-process-list.js`
- `tests/component/fixtures/wf-ui-fixture.html`
- `tests/component/wf-config-drawer.spec.js`
- `tests/component/wf-toolbar.spec.js`
- `tests/component/wf-palette.spec.js`
- `tests/component/wf-process-list.spec.js`
