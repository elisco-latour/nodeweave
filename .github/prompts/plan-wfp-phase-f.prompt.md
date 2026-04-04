# Phase F: Testing

> Part of [Wireframe Feature Parity plan](plan-wireframeFeatureParity.prompt.md). Depends on Phase E.

---

## Goal

Verify the wireframe consumer works end-to-end with unit and E2E tests.

## Steps

### F16. Unit: wireframe storage service

- Test `list`, `save`, `load`, `remove` with `wf-pipeline:` prefix.
- Run: `node --test tests/unit/wf-storage-service.test.js`

### F17. E2E: full workflow

- Palette → drag node onto canvas → connect two ports → open config drawer → edit config → undo → redo.
- Run: `pnpm exec playwright test tests/e2e/wf-full-workflow.spec.js`

### F18. E2E: save/load

- Create pipeline → save → create new → load saved → verify state restored.
- Run: `pnpm exec playwright test tests/e2e/wf-save-load.spec.js`

## Files Created

- `tests/unit/wf-storage-service.test.js`
- `tests/e2e/wf-full-workflow.spec.js`
- `tests/e2e/wf-save-load.spec.js`
