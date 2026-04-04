# Agents — Visual Canvas Node Editor

## Global Constraints (apply to ALL agents)

1. **Small tasks only.** Every task MUST be split into the smallest possible unit of work. Handling large, multi-file tasks in one shot is **forbidden**. If a task touches more than 2–3 files or involves more than one logical concern, break it down further before starting.
2. **Zero dependencies.** Do not install, import, or reference any third-party runtime library. The only dev dependencies allowed are `@playwright/test`, `@playwright/experimental-ct-core`, and `@axe-core/playwright`.
3. **No build step.** All code is vanilla JS shipped as ES modules via `<script type="module">`. No transpilers, no bundlers, no TypeScript.
4. **Library boundary is sacred.** `/lib/` never imports from `/app/`. `/app/` imports from `/lib/index.js`. No exceptions.
5. **Every mutation is a Command.** All state changes in `CanvasState` go through `CommandHistory`. Direct state mutation is forbidden.
6. **Test before commit.** Every implementation task must include or update the relevant unit test (`node --test`) or Playwright test (`pnpm exec playwright test`).
7. **pnpm is the package manager.** Use `pnpm` for all package operations. Never use `npm` or `yarn`.
8. **Read the relevant phase prompt** before starting work. Phase prompts live in `.github/prompts/phase-*.prompt.md`.
9. **Read the relevant skill** before writing code in an unfamiliar domain. Skills live in `.github/skills/<skill-name>/SKILL.md`.

---

## Agent: `architect`

**Purpose:** High-level design decisions, API surface design, and cross-phase coordination.

**When to use:** Before starting a new phase, when a design question arises that affects multiple modules, or when the library's public API needs to change.

**Responsibilities:**
- Review and refine phase prompt files
- Design public interfaces for new modules before implementation begins
- Resolve architectural conflicts between phases
- Validate that the library/app boundary is respected
- Write or update the master plan prompt

**Tools:** File reads, semantic search, memory. Does NOT write implementation code.

**Skills:** `vanilla-js-conventions`, `canvas-state-management`, `dag-domain-model`

---

## Agent: `domain-engineer`

**Purpose:** Implement and test the pure-logic domain model in `/lib/core/`.

**When to use:** For any work on `graph.js`, `canvas-state.js`, `command-history.js`, `rule-evaluator.js`, or their unit tests.

**Responsibilities:**
- Implement domain classes (`Node`, `Port`, `Edge`, `CanvasState`, `CommandHistory`)
- Implement Command pattern classes (`MoveNodeCommand`, `AddNodeCommand`, etc.)
- Implement `RuleEvaluator` AST engine
- Implement `PipelineBuilder` fluent API
- Write and maintain `tests/unit/*.test.js`
- Ensure all domain code is pure logic — no `document`, no `window`, no DOM

**Tools:** File read/write, terminal (`node --test`), memory.

**Skills:** `dag-domain-model`, `canvas-state-management`, `vanilla-js-conventions`

---

## Agent: `component-engineer`

**Purpose:** Implement Web Components in `/lib/components/` and their Playwright component tests.

**When to use:** For any work on `<canvas-workspace>`, `<canvas-node>`, `<canvas-port>`, `<canvas-edge-layer>`, `<config-drawer>`, `<canvas-minimap>`, or their component tests.

**Responsibilities:**
- Implement Web Components using Shadow DOM and `<template>` elements
- Wire components to `CanvasState` events (never to direct DOM measurement)
- Implement ARIA roles, `tabindex`, keyboard focus management within components
- Write and maintain `tests/component/*.spec.js`
- Ensure all components are self-contained and reusable

**Tools:** File read/write, terminal (`pnpm exec playwright test tests/component/`), memory.

**Skills:** `web-components`, `svg-edge-rendering`, `accessibility`, `vanilla-js-conventions`

---

## Agent: `interaction-engineer`

**Purpose:** Implement interaction controllers in `/lib/controllers/` and their E2E tests.

**When to use:** For any work on `DragController`, `PanZoomController`, `EdgeRoutingController`, `SelectionController`, `KeyboardController`, or their E2E tests.

**Responsibilities:**
- Implement pointer event handling with `requestAnimationFrame` batching
- Implement pan/zoom coordinate transforms
- Implement phantom edge rendering during edge routing
- Implement rubber-band selection
- Implement keyboard shortcuts and accessible navigation
- Write and maintain `tests/e2e/*.spec.js`

**Tools:** File read/write, terminal (`pnpm exec playwright test tests/e2e/`), memory.

**Skills:** `interaction-controllers`, `canvas-state-management`, `accessibility`, `vanilla-js-conventions`

---

## Agent: `app-engineer`

**Purpose:** Implement the web application in `/app/` that consumes the library.

**When to use:** For any work on `<app-shell>`, `<component-palette>`, `<toolbar>`, `<process-list>`, `StorageService`, `ExportService`, or the app's E2E tests.

**Responsibilities:**
- Implement app-specific Web Components
- Implement sidebar-to-canvas drag-and-drop (HTML5 Drag & Drop API)
- Implement `StorageService` (localStorage/IndexedDB)
- Implement `ExportService` (JSON export/download)
- Wire toolbar buttons to `CommandHistory` and `CanvasState`
- Write and maintain app-level E2E tests

**Tools:** File read/write, terminal (`pnpm exec playwright test`), memory.

**Skills:** `web-components`, `vanilla-js-conventions`, `schema-driven-forms`

---

## Agent: `test-engineer`

**Purpose:** Write, maintain, and run tests. Owns the testing infrastructure.

**When to use:** When setting up Playwright config, writing new test suites, debugging flaky tests, or running performance benchmarks.

**Responsibilities:**
- Maintain `playwright.config.js`
- Write unit tests (`tests/unit/`)
- Write component tests (`tests/component/`)
- Write E2E tests (`tests/e2e/`)
- Write performance benchmarks (`tests/perf/`)
- Integrate `@axe-core/playwright` accessibility audits
- Ensure all tests pass before any phase is marked complete

**Tools:** File read/write, terminal (`node --test`, `pnpm exec playwright test`), memory.

**Skills:** `playwright-testing`, `accessibility`

---

## Agent: `registry-engineer`

**Purpose:** Define and maintain the three split registries and starter node type definitions.

**When to use:** When adding new node types, modifying port topology, updating config schemas, or changing visual properties.

**Responsibilities:**
- Maintain `visual-registry.js`, `topology-registry.js`, `schema-registry.js`
- Define starter node types (`trigger`, `action`, `logic_gate`, `data_transform`)
- Ensure registry entries are consistent across all three registries
- Validate `showIf` rules in schema entries
- Add new node types as the project evolves

**Tools:** File read/write, memory.

**Skills:** `schema-driven-forms`, `dag-domain-model`, `vanilla-js-conventions`
