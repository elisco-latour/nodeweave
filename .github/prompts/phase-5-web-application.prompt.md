# Phase 5 — The Web Application

**Depends on:** Phase 2, Phase 3, Phase 4

**Agents:** `app-engineer`, `component-engineer`, `test-engineer`

**Skills:** `web-components`, `vanilla-js-conventions`, `accessibility`, `playwright-testing`

---

## Task 5.1 — Create `<app-shell>` element

Create `app/components/app-shell.js`.

`<app-shell>` (extends `HTMLElement`):
- Registers as custom element `'app-shell'`
- Shadow DOM with CSS Grid layout: sidebar (260px) | main canvas (1fr)
- Slots:
  - Sidebar: `<component-palette>` and `<process-list>`
  - Main: `<canvas-workspace>`
  - Bottom-right overlay: `<toolbar>`
  - Right panel: `<config-drawer>`
- `role="application"`, `aria-label="Visual Canvas Node Editor"`
- Creates `CanvasState`, registries, `CommandHistory` as top-level instances
- Passes them down to children via properties (not attributes — objects)

**Agent:** `app-engineer`

**Skills:** `web-components`, `accessibility`

**Acceptance:**
- Layout renders with sidebar and canvas area
- All child components receive shared state instances
- ARIA role and label present

---

## Task 5.2 — Create `<component-palette>` — static rendering

Create `app/components/component-palette.js`.

`<component-palette>` (extends `HTMLElement`):
- Shadow DOM with `role="list"`, `aria-label="Available node types"`
- Reads from `VisualRegistry` and `TopologyRegistry` to list all registered node types
- Each entry is a `<div>` with:
  - `role="listitem"`
  - `draggable="true"`
  - Node type icon (from VisualRegistry color), label
  - `tabindex="0"` for keyboard nav

**Agent:** `app-engineer`

**Skills:** `web-components`, `accessibility`

**Acceptance:**
- All registered node types appear in palette
- Each item has correct ARIA role and is focusable

---

## Task 5.3 — Create `<component-palette>` — drag-and-drop

Extend `<component-palette>`:
- `dragstart` event: set `dataTransfer.setData('application/x-node-type', nodeType)` and `dataTransfer.effectAllowed = 'copy'`
- `<canvas-workspace>` listens for `dragover` (prevent default, set `dropEffect`) and `drop`:
  - Read node type from `dataTransfer`
  - Convert drop coordinates to canvas coordinates using viewport transform
  - Create `AddNodeCommand` and execute via `CommandHistory`
- Keyboard alternative: pressing Enter on a palette item adds node at center of current viewport

**Agent:** `app-engineer` + `interaction-engineer`

**Skills:** `interaction-controllers`, `accessibility`

**Acceptance:**
- Dragging palette item onto canvas creates a node at drop position
- Keyboard Enter on palette item creates node at viewport center
- Node creation goes through `CommandHistory` (undoable)

---

## Task 5.4 — Create `<toolbar>` element

Create `app/components/toolbar.js`.

`<toolbar>` (extends `HTMLElement`):
- Shadow DOM with `role="toolbar"`, `aria-label="Canvas tools"`
- Buttons:
  - Undo (disabled when `commandHistory.canUndo === false`)
  - Redo (disabled when `commandHistory.canRedo === false`)
  - Zoom In
  - Zoom Out
  - Fit to View
  - Delete Selected
- Each button: `<button>` with SVG icon, `aria-label`, `title` tooltip
- Listens to `commandHistory` events to update undo/redo disabled state
- Dispatches appropriate commands/actions on click

**Agent:** `app-engineer`

**Skills:** `web-components`, `accessibility`

**Acceptance:**
- All buttons render with icons and labels
- Undo/redo disabled state syncs with CommandHistory
- Each button triggers the correct action

---

## Task 5.5 — Create `StorageService` — save/load to localStorage

Create `app/services/storage-service.js`.

`StorageService`:
- `save(name, canvasState)` — serializes `canvasState.toJSON()` and stores in `localStorage` under key `pipeline:${name}`
- `load(name)` — reads from `localStorage`, parses JSON, returns plain object
- `list()` — returns array of saved pipeline names (scan `localStorage` for `pipeline:` prefix)
- `delete(name)` — removes from `localStorage`
- Handles `QuotaExceededError` gracefully (throw descriptive error)

**Agent:** `app-engineer`

**Skills:** `vanilla-js-conventions`

**Acceptance:**
- Save, load, list, delete all work
- QuotaExceededError caught and re-thrown with message
- Round-trip: save then load returns equivalent data

---

## Task 5.6 — Unit tests for `StorageService`

Create `tests/unit/storage-service.test.js`.

Test cases:
- Save and load a pipeline — data matches
- List returns correct names
- Delete removes entry
- Load non-existent name returns null
- Storage key prefix is `pipeline:`

**Agent:** `test-engineer`

**Acceptance:**
- `node --test tests/unit/storage-service.test.js` — all pass

---

## Task 5.7 — Create `ExportService`

Create `app/services/export-service.js`.

`ExportService`:
- `toJSON(canvasState)` — returns formatted JSON string of pipeline graph
- `toPNG(canvasWorkspaceElement)` — uses `HTMLCanvasElement` + `drawImage()` to render viewport as PNG, returns Blob
  - Create offscreen canvas sized to viewport
  - Use `XMLSerializer` to serialize the `<canvas-workspace>` shadow DOM to SVG foreignObject
  - Draw SVG to canvas, then `canvas.toBlob()`
  - Fallback: if serialization fails, just export the JSON

**Agent:** `app-engineer`

**Acceptance:**
- JSON export produces valid JSON matching pipeline structure
- PNG export produces a Blob (at minimum the JSON fallback always works)

---

## Task 5.8 — Create `<process-list>` element

Create `app/components/process-list.js`.

`<process-list>` (extends `HTMLElement`):
- Shadow DOM with `role="list"`, `aria-label="Saved pipelines"`
- Shows list of saved pipelines from `StorageService.list()`
- Each entry: name, last-modified timestamp, buttons for Load / Delete
- "New Pipeline" button at top — clears canvas (via CommandHistory reset)
- "Save" button (or inline rename) — saves current canvas
- Load: calls `StorageService.load()` then restores to CanvasState via `fromJSON()`
- Delete: confirms with `window.confirm()` then removes

**Agent:** `app-engineer`

**Skills:** `web-components`, `accessibility`

**Acceptance:**
- Saved pipelines listed
- Load restores pipeline to canvas
- Delete removes pipeline after confirmation
- New clears the canvas

---

## Task 5.9 — Wire `<app-shell>` together

Connect all components inside `<app-shell>`:
- Instantiate `CanvasState`, `CommandHistory`, 3 registries, `StorageService`
- Pass shared instances to child components
- Register starter node types from Phase 0
- Wire `<toolbar>` buttons to `CommandHistory` and `CanvasState`
- Wire `<config-drawer>` to selection events
- Wire `<component-palette>` drag events to canvas drop handler
- Wire `<process-list>` to `StorageService`
- Auto-save on `canvasState` change events (debounced, 2s)

**Agent:** `app-engineer`

**Acceptance:**
- Full app works end-to-end: drag node from palette, connect edges, edit config, undo, save, reload
- Auto-save fires after 2s of inactivity
- All sub-components communicate through events and shared instances

---

## Task 5.10 — Update `app/index.html`

Ensure `app/index.html`:
- Imports `lib/index.js` (registers library components)
- Imports `app/components/app-shell.js`
- Contains single `<app-shell></app-shell>` element
- Includes `lib/theme.css` via `<link>`
- `<meta charset="UTF-8">`, `<meta name="viewport" ...>`
- `<title>Visual Canvas Node Editor</title>`

**Agent:** `app-engineer`

**Acceptance:**
- Opening `app/index.html` in a browser renders the full application
- No console errors on load

---

## Task 5.11 — E2E: full workflow test

Create `tests/e2e/full-workflow.spec.js`.

Test scenario:
1. Navigate to `app/index.html`
2. Drag 2 different node types from palette onto canvas
3. Connect them with an edge
4. Select first node → assert config drawer opens
5. Edit a config field → assert change persists
6. Undo config edit → assert reverted
7. Press Ctrl+Z twice → assert edge removed, then second node removed
8. Redo all → assert fully restored

**Agent:** `test-engineer`

**Skills:** `playwright-testing`

**Acceptance:**
- `pnpm exec playwright test tests/e2e/full-workflow.spec.js` — passes

---

## Task 5.12 — E2E: save/load test

Create `tests/e2e/save-load.spec.js`.

Test scenario:
1. Create a pipeline with 3 nodes and 2 edges
2. Save as "test-pipeline"
3. Click "New Pipeline" — canvas clears
4. Load "test-pipeline" — assert 3 nodes and 2 edges restored
5. Delete "test-pipeline" — assert removed from list

**Agent:** `test-engineer`

**Skills:** `playwright-testing`

**Acceptance:**
- `pnpm exec playwright test tests/e2e/save-load.spec.js` — passes

---

## Task 5.13 — Accessibility audit: full app

Create `tests/e2e/app-a11y.spec.js`.

Test cases:
- Run axe on full app shell → zero violations
- Tab through palette → toolbar → canvas → drawer → list
- Verify focus indicators visible on all interactive elements
- Verify all ARIA roles present: `application`, `list`, `toolbar`, `complementary`

**Agent:** `test-engineer`

**Skills:** `playwright-testing`, `accessibility`

**Acceptance:**
- `pnpm exec playwright test tests/e2e/app-a11y.spec.js` — zero a11y violations

---

## Phase 5 Completion Checklist

- [ ] `<app-shell>` orchestrates all components
- [ ] `<component-palette>` supports drag-and-drop and keyboard
- [ ] `<toolbar>` with undo/redo/zoom/delete
- [ ] `StorageService` with localStorage save/load/list/delete
- [ ] `ExportService` with JSON and PNG export
- [ ] `<process-list>` for pipeline management
- [ ] Full wiring: all components communicate via shared state
- [ ] Auto-save with debounce
- [ ] `app/index.html` loads and runs without errors
- [ ] All E2E tests pass
- [ ] Accessibility audit passes
