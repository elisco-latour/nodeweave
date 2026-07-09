# Angular guide

`@nodeweave/angular` is a signal-first Angular 22 binding. It renders the graph
with Angular (so nodes can be your own components) while reusing the
framework-agnostic engine and interaction controllers.

## Install

```bash
pnpm add @nodeweave/angular @nodeweave/core
```

Requires Angular `^22`, `rxjs ^7`. The component is standalone and works with
zoneless change detection.

```ts
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [provideZonelessChangeDetection()],
});
```

## The component

```ts
import { Component } from '@angular/core';
import { VisualCanvasComponent, Node, Port } from '@nodeweave/angular';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [VisualCanvasComponent],
  template: `
    <visual-canvas #cv background="dots" [snapToGrid]="true" (connect)="onConnect($event)">
    </visual-canvas>
    <button (click)="add(cv)">Add</button>
    <span>{{ cv.service.nodes().length }} nodes</span>
  `,
  styles: `visual-canvas { display: block; height: 100vh; }`,
})
export class EditorComponent {
  add(cv: VisualCanvasComponent) {
    const n = new Node({ id: crypto.randomUUID(), type: 'task', x: 120, y: 80 });
    n.addPort(new Port({ id: `${n.id}:in`, direction: 'in', nodeId: n.id }));
    n.addPort(new Port({ id: `${n.id}:out`, direction: 'out', nodeId: n.id }));
    cv.service.addNode(n);
  }
  onConnect(e: { source: string; target: string }) { /* … */ }
}
```

### Inputs / outputs

| Input | Type | Default |
|-------|------|---------|
| `nodeTypes` | `Record<string, Type<unknown>>` | `{}` |
| `background` | `'dots' \| 'lines' \| 'cross'` | `'dots'` |
| `backgroundGap` | `number` | `20` |
| `showControls` | `boolean` | `true` |
| `snapToGrid` | `boolean` | `false` |

| Output | Payload |
|--------|---------|
| `connect` | `{ source: string; target: string }` |

The component **provides** a `VisualCanvasService` and exposes it as `.service`.

## The service (signal-first)

Inject it (inside `<visual-canvas>`'s injector) or reach it via `cv.service`.

```ts
service.nodes();          // Signal<readonly Node[]>
service.edges();          // Signal<readonly Edge[]>
service.selectedIds();    // Signal<ReadonlySet<string>>
service.selectedNodes();  // Signal<readonly Node[]>
service.viewport();       // Signal<{ panX; panY; zoom }>
service.canUndo();        // Signal<boolean>
service.canRedo();        // Signal<boolean>
```

Mutations (delegate to the engine; the signals update automatically):

```ts
service.addNode(node); service.removeNode(id);
service.addEdge(edge); service.removeEdge(id);
service.selectNode(id); service.clearSelection();
service.undo(); service.redo();
service.clear();
service.toJSON(); service.loadFromJSON(json);
service.state;            // escape hatch: the underlying CanvasState
```

Because state is exposed as signals, templates update automatically under
zoneless change detection — no manual subscriptions.

## Custom node components

Map a node `type` to a standalone component. It receives the node through a
`node` input and is rendered for every node of that type; ports, edges, drag,
connect and resize are handled for you.

```ts
import { Component, input } from '@angular/core';
import { Node } from '@nodeweave/angular';

@Component({
  selector: 'app-task-node',
  standalone: true,
  template: `<div class="task">{{ node().type }} — {{ node().id }}</div>`,
  styles: `.task { height: 100%; display: grid; place-items: center; }`,
})
export class TaskNodeComponent {
  readonly node = input.required<Node>();
}
```

```ts
@Component({
  // …
  template: `<visual-canvas [nodeTypes]="nodeTypes"></visual-canvas>`,
})
export class EditorComponent {
  readonly nodeTypes = { task: TaskNodeComponent };
}
```

Node types without a mapping fall back to a built-in default node.

## Observables (secondary)

Signals are the primary API. If you need an RxJS stream, adapt a signal with
Angular's interop:

```ts
import { toObservable } from '@angular/core/rxjs-interop';
const nodes$ = toObservable(cv.service.nodes);
```

## Theming

The Angular component renders through the same `--vc-*` CSS variables as the
core. See [theming.md](theming.md).
