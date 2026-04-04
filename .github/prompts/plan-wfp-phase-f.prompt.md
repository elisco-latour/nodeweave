# Phase F: Cross-Cutting Verification

> Part of [Wireframe Feature Parity plan](plan-wireframeFeatureParity.prompt.md). Depends on Phase E.

---

## Goal

Run cross-cutting a11y audit and full regression sweep across all wireframe tests. Individual feature tests live in their respective phases (A–E).

## Steps

### F16. Cross-cutting a11y audit

- **File**: `tests/e2e/wf-a11y.spec.js`
- Run `@axe-core/playwright` against `wireframe/index.html` (same pattern as existing `tests/e2e/app-a11y.spec.js`).
- Verify no critical/serious a11y violations.
- Run: `pnpm exec playwright test tests/e2e/wf-a11y.spec.js`

### F17. Full regression suite

- Run ALL wireframe tests in sequence:
  - `node --test tests/unit/wf-*.test.js`
  - `pnpm exec playwright test tests/component/wf-*.spec.js tests/e2e/wf-*.spec.js`
- No new file — verification-only step.

### F18. Playwright config check

- Ensure `webServer` in `playwright.config.js` serves the root `/` so `wireframe/index.html` is accessible at `http://localhost:3100/wireframe/index.html`.
- Verify all wireframe test fixtures are served correctly.
- No new file unless config changes are needed.

## Files Created

- `tests/e2e/wf-a11y.spec.js`
