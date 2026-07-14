# Agents — nodeweave

Guidance for AI agents (and humans) working in this repo. **nodeweave** is a
framework-agnostic node/graph canvas: a TypeScript core of Web Components +
interaction controllers, with framework bindings on top (Angular today).

## Repository

pnpm workspace. Node 24, TypeScript ~6.0, Angular 22.

```
packages/
  core/      @build744/nodeweave-core     — framework-agnostic engine + <canvas-*> Web Components (TS → dist/ via tsc)
  angular/   @build744/nodeweave-angular  — Angular 22 binding (built with ng-packagr)
examples/
  vanilla/   plain Web Components (served statically)
  wireframe/ richer plain-WC example (its own wf-* components)
  angular/   @build744/example-angular (Angular CLI app)
website/     Docusaurus docs site (sources ../docs)
docs/        Markdown guides (the authoritative docs)
tests/       Playwright component/e2e/perf suites
```

Core unit tests (`node:test`) live in `packages/core/tests/`.

## Conventions & rules

1. **TypeScript, strict.** Core source is `packages/core/src/**/*.ts`, compiled
   to `dist/`. Relative imports keep the `.js` extension (ESM/NodeNext style).
2. **One source of truth.** `CanvasState` (an `EventTarget`) owns nodes, edges,
   selection and viewport. Renderers observe its events; they don't hold
   duplicate state.
3. **Every undoable mutation is a Command.** Go through `CanvasState`'s
   command methods (`addNode`, `setNodePosition`, `resizeNode`, …). Use
   `moveNodeDirect` / `resizeNodeDirect` only for non-undoable live preview,
   then commit once.
4. **The engine is renderer-agnostic.** Controllers locate nodes/ports by CSS
   selector (`nodeSelector` / `portSelector`). Don't bake a specific renderer
   into `core`. There are intentionally three renderers (the `canvas-*` Web
   Components, the wireframe example, and the Angular binding) — don't
   consolidate them without discussion.
5. **Theming is `--nw-*` CSS custom properties.** See `docs/theming.md`.
6. **pnpm only.** Cross-package deps use `workspace:*`.
7. **Don't commit build output.** `dist/`, `website/build`, `.angular`,
   `.docusaurus`, `test-results` are gitignored.
8. **Test before commit.** Core changes: `pnpm --filter @build744/nodeweave-core test`.
   Prefer verifying behavior (build the package / run the example) over trusting
   types alone.

## Common commands

```bash
pnpm install
pnpm build                                   # core, then angular
pnpm --filter @build744/nodeweave-core test           # node:test unit suite
pnpm --filter @build744/nodeweave-core build          # tsc → packages/core/dist
pnpm --filter @build744/nodeweave-angular build       # ng-packagr → packages/angular/dist
pnpm --filter @build744/example-angular start   # Angular example (ng serve)
pnpm --filter @build744/website start       # docs site (Docusaurus)
npx serve examples/vanilla                    # a plain-WC example (after a core build)
pnpm exec playwright test [--project=component|e2e|perf]
```

Examples import the **built** core (`packages/core/dist`), so run a core build
first.

## Where things live

- `packages/core/src/core/` — `graph`, `canvas-state` (+ commands), `command-history`, `edge-paths`, `viewport-culling`, `pipeline-builder`, `rule-evaluator`
- `packages/core/src/controllers/` — drag, pan-zoom, selection, edge-routing, keyboard, resize
- `packages/core/src/components/` — the `<canvas-*>` Web Components
- `packages/core/src/registries/` — visual / topology / schema
- `packages/angular/src/lib/` — the service, `<nodeweave>` component, Angular edge layer, DOM-binding directives

## Gotchas

- The Angular binding renders nodes itself (Angular templates) and reuses the
  engine + controllers; its internal DOM uses `vc-*` class/attribute names
  (`.vc-node`, `data-vc-node`, `vc-edge-layer`) — internal, not public API.
- `requestAnimationFrame`-batched interactions (drag) won't advance in a
  backgrounded/headless tab — verify with the reactive state, not just synthetic
  pointer events.
- The Playwright suite predates the TS migration/monorepo and may need path
  fixes before it runs green.
