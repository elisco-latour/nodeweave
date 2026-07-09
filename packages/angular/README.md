# @visual-canvas/angular

Angular 22 integration for [visual-canvas](../../README.md) — a signal-first
node/graph canvas.

## Install

```bash
pnpm add @visual-canvas/angular visual-canvas
```

Requires Angular `^22` and `rxjs ^7`.

## Usage

```ts
import { Component, viewChild } from '@angular/core';
import { VisualCanvasComponent, Node, Port } from '@visual-canvas/angular';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [VisualCanvasComponent],
  template: `
    <visual-canvas #canvas background="dots" [snapToGrid]="true"
                   (connect)="onConnect($event)"></visual-canvas>
    <button (click)="add()">Add node</button>
    <p>{{ canvas.service.nodes().length }} nodes</p>
  `,
  styles: `visual-canvas { height: 100vh; display: block; }`,
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

## API

### `VisualCanvasComponent` (`<visual-canvas>`)

Inputs: `background` (`'dots'|'lines'|'cross'`), `backgroundGap`, `showControls`,
`snapToGrid`. Output: `connect`. Exposes `.service` (a `VisualCanvasService`).

### `VisualCanvasService` (signal-first)

Signals: `nodes`, `edges`, `selectedIds`, `selectedNodes`, `viewport`,
`canUndo`, `canRedo`. Mutations: `addNode`, `removeNode`, `addEdge`,
`removeEdge`, `selectNode`, `clearSelection`, `undo`, `redo`, `clear`,
`toJSON`, `loadFromJSON`. Escape hatch: `.state` (the underlying
`CanvasState`) and the three registries.
