# Phase A: Library Decoupling — Required Selectors

> Part of [Wireframe Feature Parity plan](plan-wireframeFeatureParity.prompt.md). No dependencies — start here first.

---

## Goal

Make all 4 library controllers consumer-agnostic by requiring a `selectors` object. No defaults, no backwards compat.

## Steps

### A1. Refactor all 4 controllers to require a `selectors` object

`DragController(workspace, state, selectors)` where `selectors = { node: '...', port: '...' }`.

- Replace `tagName` comparison → `el.matches(selector)`.
- Replace `querySelectorAll('canvas-node')` → `querySelectorAll(this.#nodeSelector)`.
- Affected controllers and spot counts:
  - **`DragController`** — 4 spots
  - **`SelectionController`** — 4 spots + **remove `data-selected` toggling entirely**. Push to consumer — controller only dispatches `selection-changed`, consumer styles its own nodes.
  - **`EdgeRoutingController`** — 3 spots. `selectors` becomes 4th param after `edgeLayer`.
  - **`KeyboardController`** — 3 spots

### A2. Fix `app-shell.js`

- Pass `{ node: 'canvas-node', port: 'canvas-port' }` to all controller instantiations.
- Add a `selection-changed` listener that toggles `data-selected` on `<canvas-node>` elements (≈6 lines moved from `SelectionController`).

### A3. Fix tests

- Update any fixtures/test code that instantiate controllers to pass selectors.
- Run full suite: `node --test tests/unit/*.test.js` + `pnpm exec playwright test --project=component --project=e2e`.

### A4. Acceptance tests for selector-based controllers

- **Unit test** `tests/unit/controller-selectors.test.js`:
  - Verify each controller throws if `selectors` argument is missing.
  - Verify `el.matches(selector)` is used instead of `tagName` comparison (test via mock elements with custom tag names).
- **E2E regression**: Run existing `tests/e2e/full-workflow.spec.js` and `tests/e2e/drag-drop.spec.js` to confirm the app still works after the refactor. No new E2E file — reuse the existing suite.
- Run: `node --test tests/unit/controller-selectors.test.js` + `pnpm exec playwright test --project=e2e`

## Files Modified

- `lib/controllers/drag-controller.js`
- `lib/controllers/selection-controller.js`
- `lib/controllers/edge-routing-controller.js`
- `lib/controllers/keyboard-controller.js`
- `app/components/app-shell.js`
- Any test files that instantiate controllers

## Files Created

- `tests/unit/controller-selectors.test.js`

## What Breaks in the App Consumer (Intentionally)

- All 4 controller instantiations in `app-shell.js` must pass `{ node: 'canvas-node', port: 'canvas-port' }`.
- App must add its own `selection-changed` listener to toggle `data-selected` on `<canvas-node>` elements.
