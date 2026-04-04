# Plan: Wireframe — Minimap, PNG Export, Theme Toggle, Viewport Culling

Add four deferred features to the wireframe app. Three (minimap, viewport culling, PNG export) have existing library implementations — the work is mostly wiring and adaptation. Theme toggle requires new CSS variables and a small component.

## Phase Prompts

| Phase | Prompt | Summary | Dependencies |
|-------|--------|---------|-------------|
| 1 | `phase-wf1-viewportCulling.prompt.md` | Wire `ViewportCulling` into `wf-workspace`, add `setVisibleNodes` to edge layer, component test | None |
| 2 | `phase-wf2-themeToggle.prompt.md` | Create `theme.css`, replace hardcoded colors, build `<wf-theme-toggle>`, component test | None |
| 3 | `phase-wf3-minimap.prompt.md` | Wire lib's `<canvas-minimap>` into `wf-shell`, E2E test | Phase 1, Phase 2 |
| 4 | `phase-wf4-pngExport.prompt.md` | Add `exportPNG()` to export service, PNG button to toolbar, E2E test | Phase 2 |
| 5 | `phase-wf5-testing.prompt.md` | Full regression pass + cross-feature spot checks | Phases 1–4 |

## Dependency Graph

```
Phase 1 (Culling) ──┐
                     ├──→ Phase 3 (Minimap) ──┐
Phase 2 (Theme)  ───┤                         ├──→ Phase 5 (Testing)
                     ├──→ Phase 4 (PNG Export) ┘
```

## Decisions

- Use `<canvas-minimap>` from lib directly (single-file import, not full barrel) — consumer-agnostic, no duplication
- `--wf-*` CSS var prefix, mapped to `--vc-*` for lib components
- Theme toggle: fixed top-right corner
- PNG export: new toolbar button
- Scope excludes: SVG export, minimap resize responsiveness, custom minimap edge rendering
