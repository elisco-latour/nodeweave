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

## Files Created

- `wireframe/components/wf-config-drawer.js`
- `wireframe/components/wf-toolbar.js`
- `wireframe/components/wf-palette.js`
- `wireframe/components/wf-process-list.js`
