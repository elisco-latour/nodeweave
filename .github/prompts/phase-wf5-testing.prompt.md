# Phase 5 — Regression & Cross-Feature Testing

> Parent plan: `plan-wireframeMinimapPngThemeCulling.prompt.md`
> Dependencies: Phases 1–4 (all implementation and per-phase tests complete)

---

## Goal

Run all wireframe tests together as a final regression pass. Verify the four features don't interfere with each other or with existing functionality.

## Tasks

### 13. Regression: run all wireframe tests

```bash
# Per-phase tests (should already pass individually)
pnpm exec playwright test tests/component/wf-viewport-culling.spec.js
pnpm exec playwright test tests/component/wf-theme-toggle.spec.js
pnpm exec playwright test tests/e2e/wf-minimap.spec.js
pnpm exec playwright test tests/e2e/wf-png-export.spec.js

# Existing wireframe E2E
pnpm exec playwright test tests/e2e/wf-full-workflow.spec.js
pnpm exec playwright test tests/e2e/wf-save-load.spec.js

# All wireframe tests at once
pnpm exec playwright test tests/**/wf-*.spec.js
```

### 14. Cross-feature spot checks

- Culling + minimap: zoom out so nodes are culled → minimap still shows all nodes (minimap reads `CanvasState`, not DOM)
- Theme + PNG export: switch to dark theme → export PNG → verify the exported image uses dark colors
- Theme + minimap: toggle theme → minimap redraws with correct colors
- Culling + E2E workflow: add nodes, connect edges, zoom in tight → culled nodes don't break edge routing or selection

## Verification

```bash
pnpm exec playwright test tests/**/wf-*.spec.js
```

All tests green = phase complete.
