---
name: playwright-testing
description: "Node.js Playwright testing setup and conventions with pnpm. Use when writing, running, or debugging any test: unit tests (node --test), component tests (@playwright/experimental-ct-core), E2E tests, performance benchmarks, or accessibility audits (@axe-core/playwright). Covers: playwright.config.js structure, test file organization (tests/unit, tests/component, tests/e2e, tests/perf), Shadow DOM piercing locators, axe-core integration, serve-based webServer config."
---

# Playwright Testing

This project uses **Node.js Playwright** with pnpm for all browser-based testing.

## Setup
- Dev dependencies: `@playwright/test`, `@playwright/experimental-ct-core`, `@axe-core/playwright`
- Config file: `playwright.config.js` at project root
- Package manager: `pnpm`

## Test Categories

### Unit Tests (no Playwright)
- Location: `tests/unit/*.test.js`
- Runner: `node --test`
- For pure-logic classes: `CommandHistory`, `RuleEvaluator`, `CanvasState`, registries, `ViewportCulling`
- No DOM, no browser — just JS logic
- Run: `pnpm exec node --test tests/unit/`

### Component Tests
- Location: `tests/component/*.spec.js`
- Runner: `pnpm exec playwright test tests/component/`
- Use `@playwright/experimental-ct-core` to mount individual Web Components in isolation
- Test rendering, attribute reflection, event dispatch, ARIA
- Mount pattern:
```js
import { test, expect } from '@playwright/experimental-ct-core';

test('renders node with label', async ({ mount }) => {
  const component = await mount(`<canvas-node></canvas-node>`);
  // set properties, assert rendering
});
```

### E2E Tests
- Location: `tests/e2e/*.spec.js`
- Runner: `pnpm exec playwright test tests/e2e/`
- Navigate to `app/index.html` via local server
- Test full user workflows: drag-and-drop, edge creation, config editing, save/load
- Use a static file server (Playwright's `webServer` config)

### Performance Tests
- Location: `tests/perf/*.spec.js`
- Runner: `pnpm exec playwright test tests/perf/`
- Benchmarks: 200, 500, 1000 nodes
- Measure render time, frame rate during pan, incremental add time

## Playwright Config Structure
```js
// playwright.config.js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.spec.js'],
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'pnpm exec npx serve . -p 3000 -s',
    port: 3000,
    reuseExistingServer: true,
  },
  projects: [
    { name: 'component', testDir: './tests/component' },
    { name: 'e2e', testDir: './tests/e2e' },
    { name: 'perf', testDir: './tests/perf' },
  ],
});
```

## Accessibility Testing
- Use `@axe-core/playwright` for automated a11y scanning:
```js
import AxeBuilder from '@axe-core/playwright';

test('no a11y violations', async ({ page }) => {
  await page.goto('/app/index.html');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

## Conventions
- One `test()` per behavior — keep tests atomic
- Use descriptive test names: `test('should move node to new position on drag')`
- Use `test.describe()` for grouping related tests
- Prefer Playwright locators over raw selectors: `page.getByRole()`, `page.getByLabel()`
- For Shadow DOM: use `page.locator('canvas-node').locator('css=.node-label')` to pierce shadow
- Always `await` Playwright actions — no fire-and-forget
- Clean state between tests — each test should not depend on another's side effects

## Running Tests
```bash
# All tests
pnpm exec playwright test

# Specific category
pnpm exec playwright test tests/e2e/

# Specific file
pnpm exec playwright test tests/e2e/full-workflow.spec.js

# Unit tests (no Playwright)
node --test tests/unit/

# With UI mode for debugging
pnpm exec playwright test --ui
```
