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

## Files Created

- `wireframe/components/wf-shell.js`

## Files Modified

- `wireframe/index.html`
- `wireframe/components/wf-node.js` (if ⋮ button dispatch not yet wired)
