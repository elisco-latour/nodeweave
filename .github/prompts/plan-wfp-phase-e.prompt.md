# Phase E: Shell & Wiring

> Part of [Wireframe Feature Parity plan](plan-wireframeFeatureParity.prompt.md). Depends on Phases A–D.

---

## Goal

Wire everything together in a `<wf-shell>` orchestrator and clean up `wireframe/index.html`.

## Steps

### E13. `<wf-shell>` orchestrator

- Instantiate all 5 controllers with selectors: `{ node: 'wf-node', port: '[data-port]' }`.
- Handle palette drag-and-drop → `state.addNode()`.
- Handle `selection-changed` → open/close `<wf-config-drawer>`, set `aria-selected` on `<wf-node>` elements.
- Handle `node-config-updated` → update node config in state.
- Auto-save with 2s debounce via `WfStorageService`.
- Fit-to-view on first load.
- Reattach controllers on `state-reset` (new/load pipeline).
- Wire ⋮ context menu (step E15).

### E14. Update `wireframe/index.html`

- Replace all inline `<script>` setup with `<wf-shell></wf-shell>`.
- Import `wf-shell.js` as module.
- Remove manual node/edge creation code.

### E15. Wire ⋮ context menu

- `wf-node` dispatches a context-menu event on ⋮ button click.
- `wf-shell` shows a floating menu with Duplicate / Delete actions.

### E16. E2E: wireframe full workflow

- **File**: `tests/e2e/wf-full-workflow.spec.js`
- **Fixture**: `tests/e2e/fixtures/wf-e2e-fixture.html` (or navigate directly to `wireframe/index.html`)
- Palette → drag node onto canvas → connect two ports → open config drawer → edit config → undo → redo.
- Follow existing `tests/e2e/full-workflow.spec.js` patterns: `waitForApp()` helper, `page.evaluate()` for state access, expose `window.__state`.
- Run: `pnpm exec playwright test tests/e2e/wf-full-workflow.spec.js`

### E17. E2E: wireframe save/load

- **File**: `tests/e2e/wf-save-load.spec.js`
- Create pipeline → save → create new → load saved → verify state restored.
- Dialog interception pattern from existing `tests/e2e/save-load.spec.js`.
- Run: `pnpm exec playwright test tests/e2e/wf-save-load.spec.js`

## Files Created

- `wireframe/components/wf-shell.js`
- `tests/e2e/wf-full-workflow.spec.js`
- `tests/e2e/wf-save-load.spec.js`
- `tests/e2e/fixtures/wf-e2e-fixture.html`

## Files Modified

- `wireframe/index.html`
- `wireframe/components/wf-node.js` (if ⋮ button dispatch not yet wired)

# Constraints
I would like to add some precision here. The shell of wireframe should not be matched to the shell of the app.
The UI and the UX of the wireframe should not be broken. Right now in opposite to the app , the wireframe palette is at the top with 04 available elements, this design should be kept, eventually adding the toolbar in the bottom(you see how you adapt the UI), but the wirefame design and user experience should not be broken.
Now continue where you were.