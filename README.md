# nodeweave

A framework-agnostic **node / graph canvas** engine — build node editors,
flow builders, pipelines and diagrams. A small, zero-runtime-dependency core
of Web Components + interaction controllers, with first-class framework
bindings on top (Angular today; the core is renderer-agnostic by design).

```
   ┌── engine (framework-agnostic) ──────────────┐
   │  state · commands/undo · DAG validation      │
   │  controllers (drag/pan/zoom/connect/resize)  │
   └──────────────────────────────────────────────┘
        ▲                     ▲                ▲
   canvas-* (default)    Angular renderer   (React / Svelte / …)
   Web Components        @nodeweave/angular      future
```

## Features

- **Nodes & edges** with typed ports and DAG (cycle) validation
- **Edge types** — bezier, straight, step, smoothstep — plus arrowhead markers, midpoint labels and animated (flowing) edges
- **Interactions** — drag, multi-select + rubber-band, pan/zoom, connect-by-drag, 8-handle resize, keyboard (nudge / delete / undo-redo / copy-paste)
- **Undo/redo** via a command history
- **Viewport culling** for large graphs, plus a minimap
- **Registries** describing node types (appearance, ports, config schema)
- **Theming** through `--nw-*` CSS custom properties
- **Signal-first Angular 22 binding** with custom node components (`nodeTypes`)

## Packages

| Package | Description |
|---------|-------------|
| [`@nodeweave/core`](packages/core) | Framework-agnostic engine + default `<canvas-*>` Web Components |
| [`@nodeweave/angular`](packages/angular) | Angular 22 binding (signal-first) |
| [`@nodeweave/angular-authoring`](packages/angular-authoring) | Catalog-driven authoring UX (palette, schema inspector, drag-to-create) |

Examples live in [`examples/`](examples): `vanilla` and `wireframe` (plain Web
Components) and `angular` (Angular 22).

## Install

```bash
# vanilla / Web Components
pnpm add @nodeweave/core

# Angular
pnpm add @nodeweave/angular @nodeweave/core
```

## Quick start — vanilla

```html
<canvas-workspace id="ws" style="width:100%;height:100%"></canvas-workspace>
```

```js
import {
  CanvasState, Node, Port,
  DragController, PanZoomController, SelectionController,
  EdgeRoutingController, KeyboardController, ResizeController,
} from '@nodeweave/core'; // importing from the root also registers <canvas-*>

const state = new CanvasState();
const ws = document.getElementById('ws');
ws.state = state;

const options = { nodeSelector: 'canvas-node', portSelector: 'canvas-port' };
const edgeLayer = ws.shadowRoot.querySelector('canvas-edge-layer');
for (const c of [
  new DragController(ws, state, options),
  new PanZoomController(ws, state),
  new SelectionController(ws, state, options),
  new EdgeRoutingController(ws, state, edgeLayer, options),
  new KeyboardController(ws, state, options),
  new ResizeController(ws, state, options),
]) c.attach();

const a = new Node({ id: 'a', type: 'task', x: 80, y: 80 });
a.addPort(new Port({ id: 'a:out', direction: 'out', nodeId: 'a' }));
state.addNode(a);
```

See [docs/getting-started.md](docs/getting-started.md).

## Quick start — Angular

```ts
import { Component } from '@angular/core';
import { VisualCanvasComponent, Node, Port } from '@nodeweave/angular';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [VisualCanvasComponent],
  template: `<nodeweave #cv [snapToGrid]="true"></nodeweave>
             <button (click)="add(cv)">Add</button>`,
  styles: `nodeweave { display:block; height:100vh; }`,
})
export class EditorComponent {
  add(cv: VisualCanvasComponent) {
    const n = new Node({ id: crypto.randomUUID(), type: 'task', x: 120, y: 80 });
    n.addPort(new Port({ id: `${n.id}:out`, direction: 'out', nodeId: n.id }));
    cv.service.addNode(n);        // signals update the view
  }
}
```

See [docs/angular.md](docs/angular.md) — including custom Angular node components.

## Documentation

- [Getting started (vanilla)](docs/getting-started.md)
- [Angular guide](docs/angular.md)
- [`@nodeweave/core` API reference](docs/core-api.md)
- [Custom edges](docs/custom-edges.md)
- [Layout](docs/layout.md)
- [Export & persistence](docs/export.md)
- [Theming (`--nw-*` variables)](docs/theming.md)
- [Accessibility](docs/accessibility.md)
- [Coming from React Flow](docs/migration.md)

## Concepts

- **One source of truth.** `CanvasState` (an `EventTarget`) holds nodes, edges,
  selection and viewport. Everything else observes its events.
- **Every mutation is a command.** Add / remove / move / resize / paste go
  through a `CommandHistory`, so undo/redo is free.
- **The engine is renderer-agnostic.** Controllers find nodes/ports by CSS
  selector, so any view layer works — the `<canvas-*>` Web Components are the
  default; `@nodeweave/angular` renders with Angular; other frameworks can too.

## Development

pnpm workspace — Node 24, TypeScript ~6.0, Angular 22.

```bash
pnpm install
pnpm build             # build the three @nodeweave/* packages
pnpm test              # @nodeweave/core unit tests (node:test)
pnpm verify:packages   # pre-publish dry-run (tarball contents + publint + attw)
pnpm --filter @nodeweave/example-angular start   # run the Angular example
```

## Releasing

Independent per-package semantic versioning via [Changesets](https://github.com/changesets/changesets),
published to npm from CI. Add a changeset with your change (`pnpm changeset`);
merging to `main` opens a "Version Packages" PR, and merging that publishes.
See [RELEASING.md](RELEASING.md).

## License

ISC

