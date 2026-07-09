# @nodeweave/angular

Angular 22 integration for [nodeweave](../../README.md) — a signal-first
node/graph canvas.

## Install

```bash
pnpm add @nodeweave/angular @nodeweave/core
```

Requires Angular `^22` and `rxjs ^7`.

## Usage

```ts
import { Component, viewChild } from '@angular/core';
import { VisualCanvasComponent, Node, Port } from '@nodeweave/angular';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [VisualCanvasComponent],
  template: `
    <nodeweave #canvas background="dots" [snapToGrid]="true"
                   (connect)="onConnect($event)"></nodeweave>
    <button (click)="add()">Add node</button>
    <p>{{ canvas.service.nodes().length }} nodes</p>
  `,
  styles: `nodeweave { height: 100vh; display: block; }`,
})
export class EditorComponent {
  readonly canvas = viewChild.required(VisualCanvasComponent);

  add() {
    const svc = this.canvas().service;
    const n = new Node({ id: crypto.randomUUID(), type: 'task', x: 120, y: 80 });
    n.addPort(new Port({ id: `${n.id}:out`, direction: 'out', nodeId: n.id }));
    svc.addNode(n);
  }

  onConnect(e: { source: string; target: string }) {
    console.log('connected', e.source, '->', e.target);
  }
}
```

## Custom node components

Map a node's `type` to a standalone Angular component via `nodeTypes`. The
component receives the node through a `node` input and is rendered for every
node of that type; ports, edges, drag, connect and resize are handled for you.

```ts
import { Component, input } from '@angular/core';
import { Node } from '@nodeweave/angular';

@Component({
  selector: 'app-task-node',
  standalone: true,
  template: `<div class="task">{{ node().id }}</div>`,
})
export class TaskNodeComponent {
  readonly node = input.required<Node>();
}

// in the host component:
//   readonly nodeTypes = { task: TaskNodeComponent };
//   <nodeweave [nodeTypes]="nodeTypes"></nodeweave>
```

Nodes whose type has no mapping fall back to a default node.

## API

### `VisualCanvasComponent` (`<nodeweave>`)

Inputs: `nodeTypes` (`Record<string, Type>`), `background`
(`'dots'|'lines'|'cross'`), `backgroundGap`, `showControls`, `snapToGrid`.
Output: `connect`. Exposes `.service` (a `VisualCanvasService`).

### `VisualCanvasService` (signal-first)

Signals: `nodes`, `edges`, `selectedIds`, `selectedNodes`, `viewport`,
`canUndo`, `canRedo`. Mutations: `addNode`, `removeNode`, `addEdge`,
`removeEdge`, `selectNode`, `clearSelection`, `undo`, `redo`, `clear`,
`toJSON`, `loadFromJSON`. Escape hatch: `.state` (the underlying
`CanvasState`) and the three registries.
