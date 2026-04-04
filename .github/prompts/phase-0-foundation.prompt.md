# Phase 0 — Foundation

**Blocks:** All other phases. Nothing starts until Phase 0 is complete.

**Agents:** `architect`, `test-engineer`, `registry-engineer`

**Skills:** `vanilla-js-conventions`, `playwright-testing`

---

## Task 0.1 — Create directory structure

Create the following empty directories:

```
lib/core/
lib/components/
lib/controllers/
lib/registries/
app/components/
app/services/
app/styles/
tests/unit/
tests/component/
tests/e2e/
tests/perf/
```

Place a `.gitkeep` in each leaf directory to ensure Git tracks them.

**Agent:** `architect`

**Acceptance:**
- All directories exist
- `git status` shows them as tracked

---

## Task 0.2 — Initialize pnpm project

Run `pnpm init` at the workspace root. Set `"type": "module"` in `package.json` to enable native ES module imports.

**Agent:** `architect`

**Acceptance:**
- `package.json` exists with `"type": "module"`

---

## Task 0.3 — Install dev dependencies

```sh
pnpm add -D @playwright/test @playwright/experimental-ct-core @axe-core/playwright
pnpm exec playwright install
```

These are the ONLY allowed dev dependencies for the entire project.

**Agent:** `test-engineer`

**Acceptance:**
- `pnpm ls -D` shows exactly these three packages
- `pnpm-lock.yaml` exists

---

## Task 0.4 — Create `playwright.config.js`

Create a single Playwright config at the workspace root that supports:
- Component tests: `tests/component/` directory, using `@playwright/experimental-ct-core`
- E2E tests: `tests/e2e/` directory, with `baseURL` pointing to a local file server
- Performance tests: `tests/perf/` directory

Use Chromium only for initial development. Add Firefox/WebKit later.

**Agent:** `test-engineer`

**Acceptance:**
- `pnpm exec playwright test --list` runs without error
- Config properly separates component, e2e, and perf projects

---

## Task 0.5 — Implement `CommandHistory`

Create `lib/core/command-history.js`.

Define the `Command` interface (duck-typed):
- `execute()` — perform the action
- `undo()` — reverse the action

Implement `CommandHistory`:
- `execute(command)` — runs `command.execute()`, pushes to undo stack, clears redo stack
- `undo()` — pops from undo stack, calls `command.undo()`, pushes to redo stack
- `redo()` — pops from redo stack, calls `command.execute()`, pushes to undo stack
- `canUndo` — getter, returns boolean
- `canRedo` — getter, returns boolean
- `clear()` — empties both stacks

Export `CommandHistory` as a named export.

**Agent:** `domain-engineer`

**Skills:** `canvas-state-management`, `vanilla-js-conventions`

**Acceptance:**
- `node --test tests/unit/command-history.test.js` passes
- No DOM references in the file

---

## Task 0.6 — Unit tests for `CommandHistory`

Create `tests/unit/command-history.test.js`.

Test cases:
- Execute a command, verify `canUndo` is true and `canRedo` is false
- Undo, verify command's `undo()` was called
- Redo after undo, verify command's `execute()` was called again
- Execute after undo clears redo stack
- `clear()` empties both stacks
- Undo on empty stack is a no-op (no error)
- Redo on empty stack is a no-op (no error)

**Agent:** `test-engineer`

**Skills:** `playwright-testing`

**Acceptance:**
- `node --test tests/unit/command-history.test.js` — all tests pass

---

## Task 0.7 — Create `VisualRegistry`

Create `lib/registries/visual-registry.js`.

Implement `VisualRegistry` as a `Map`-backed class:
- `register(nodeType, visualDef)` — registers a visual definition `{ label, color, icon }`
- `get(nodeType)` — returns the visual definition or throws if not found
- `has(nodeType)` — returns boolean
- `getAll()` — returns an iterator of `[nodeType, visualDef]` entries

**Agent:** `registry-engineer`

**Skills:** `vanilla-js-conventions`

**Acceptance:**
- File exports `VisualRegistry` class
- No DOM references

---

## Task 0.8 — Create `TopologyRegistry`

Create `lib/registries/topology-registry.js`.

Implement `TopologyRegistry` as a `Map`-backed class:
- `register(nodeType, topologyDef)` — registers `{ inputs: [...], outputs: [...] }` where each entry is `{ id, label, position }`
- `get(nodeType)` — returns the topology definition or throws
- `has(nodeType)` — returns boolean

**Agent:** `registry-engineer`

**Skills:** `vanilla-js-conventions`, `dag-domain-model`

**Acceptance:**
- File exports `TopologyRegistry` class
- No DOM references

---

## Task 0.9 — Create `SchemaRegistry`

Create `lib/registries/schema-registry.js`.

Implement `SchemaRegistry` as a `Map`-backed class:
- `register(nodeType, configSchema)` — registers a config schema object (field definitions with `type`, `label`, `default`, optional `showIf`)
- `get(nodeType)` — returns the config schema or throws
- `has(nodeType)` — returns boolean

**Agent:** `registry-engineer`

**Skills:** `schema-driven-forms`, `vanilla-js-conventions`

**Acceptance:**
- File exports `SchemaRegistry` class
- No DOM references

---

## Task 0.10 — Define starter node types

Create `lib/registries/starter-nodes.js`.

Define 4 node types across all 3 registries: `trigger`, `action`, `logic_gate`, `data_transform`.

Export a `registerStarterNodes(visualRegistry, topologyRegistry, schemaRegistry)` function that populates all three registries.

**Agent:** `registry-engineer`

**Skills:** `schema-driven-forms`, `dag-domain-model`

**Acceptance:**
- Calling `registerStarterNodes()` registers 4 types in each of the 3 registries
- Each type has at least 1 input and 1 output port (except `trigger` which has only outputs)
- Each type has at least 2 config schema fields
- At least 1 field uses a `showIf` directive

---

## Task 0.11 — Create `lib/index.js` (initial public surface)

Create `lib/index.js` that re-exports:
- `CommandHistory` from `./core/command-history.js`
- `VisualRegistry` from `./registries/visual-registry.js`
- `TopologyRegistry` from `./registries/topology-registry.js`
- `SchemaRegistry` from `./registries/schema-registry.js`
- `registerStarterNodes` from `./registries/starter-nodes.js`

This file will grow as new modules are added in later phases.

**Agent:** `architect`

**Acceptance:**
- `import { CommandHistory, VisualRegistry } from './lib/index.js'` works in a test script

---

## Task 0.12 — Create `app/index.html` shell

Create a minimal HTML file at `app/index.html`:
- `<!DOCTYPE html>`, `<html lang="en">`
- `<meta charset="utf-8">`, `<meta name="viewport">`
- `<title>Visual Canvas Editor</title>`
- `<link rel="stylesheet" href="styles/theme.css">`
- `<script type="module" src="app.js"></script>`
- `<body>` with a single `<app-shell></app-shell>` element

**Agent:** `app-engineer`

**Acceptance:**
- Valid HTML5
- Uses `type="module"` for the script tag

---

## Task 0.13 — Create `app/styles/theme.css` with CSS custom properties

Create a minimal theme file defining CSS custom properties for:
- Colors: `--color-bg`, `--color-surface`, `--color-text`, `--color-primary`, `--color-success`, `--color-warning`, `--color-error`
- Spacing: `--space-xs`, `--space-sm`, `--space-md`, `--space-lg`
- Border radius: `--radius-sm`, `--radius-md`
- Font: `--font-family`, `--font-size-sm`, `--font-size-md`

Use a dark theme by default.

**Agent:** `app-engineer`

**Acceptance:**
- File contains only CSS custom property definitions on `:root`
- No component-specific styles

---

## Phase 0 Completion Checklist

- [ ] All directories created with `.gitkeep`
- [ ] `package.json` with `"type": "module"`
- [ ] Dev dependencies installed (3 packages only)
- [ ] `playwright.config.js` functional
- [ ] `CommandHistory` implemented + unit tested
- [ ] All 3 registries implemented
- [ ] 4 starter node types defined
- [ ] `lib/index.js` exports all Phase 0 modules
- [ ] `app/index.html` and `app/styles/theme.css` created
