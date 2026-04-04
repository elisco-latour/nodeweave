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

## Files Modified

- `lib/controllers/drag-controller.js`
- `lib/controllers/selection-controller.js`
- `lib/controllers/edge-routing-controller.js`
- `lib/controllers/keyboard-controller.js`
- `app/components/app-shell.js`
- Any test files that instantiate controllers

## What Breaks in the App Consumer (Intentionally)

- All 4 controller instantiations in `app-shell.js` must pass `{ node: 'canvas-node', port: 'canvas-port' }`.
- App must add its own `selection-changed` listener to toggle `data-selected` on `<canvas-node>` elements.
