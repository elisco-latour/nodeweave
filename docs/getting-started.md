# Getting started (vanilla)

`@nodeweave/core` ships as native ES modules and Web Components — no bundler
required. This guide builds a minimal, interactive canvas.

## Install

```bash
pnpm add @nodeweave/core
```

Or load it directly in the browser (it's plain ESM):

```html
<script type="module">
  import { CanvasState /* … */ } from '/node_modules/@nodeweave/core/dist/index.js';
</script>
```

## 1. Markup + theme

```html
<canvas-workspace id="ws"></canvas-workspace>
<style>
  canvas-workspace { display: block; width: 100vw; height: 100vh; }
  :root {
    --nw-node-bg: #16213e;
    --nw-node-border: #2a3a5e;
    --nw-text-color: #e2e8f0;
    --nw-edge-color: #64748b;
  }
</style>
```

See [theming.md](theming.md) for the full list of variables.

## 2. State + controllers

Importing from `@nodeweave/core` (the root entry) both gives you the symbols
**and** registers the `<canvas-*>` custom elements.

```js
import {
  CanvasState, Node, Port, Edge,
  DragController, PanZoomController, SelectionController,
  EdgeRoutingController, KeyboardController, ResizeController,
} from '@nodeweave/core';

const state = new CanvasState();
const ws = document.getElementById('ws');
ws.state = state;                       // the workspace renders from the state

// Controllers are renderer-agnostic — they find nodes/ports by CSS selector.
const options = { nodeSelector: 'canvas-node', portSelector: 'canvas-port' };
const edgeLayer = ws.shadowRoot.querySelector('canvas-edge-layer');

const controllers = [
  new DragController(ws, state, options),
  new PanZoomController(ws, state),
  new SelectionController(ws, state, options),
  new EdgeRoutingController(ws, state, edgeLayer, options),
  new KeyboardController(ws, state, options),
  new ResizeController(ws, state, options),
];
controllers.forEach((c) => c.attach());
// call c.detach() on teardown
```

> Tree-shaking: if you don't need the default Web Components, import the engine
> from `@nodeweave/core/core` and `@nodeweave/core/controllers` instead of the
> root entry (the root registers the components as a side effect).

## 3. Nodes, ports, edges

```js
const a = new Node({ id: 'a', type: 'trigger', x: 80, y: 80 });
a.addPort(new Port({ id: 'a:out', direction: 'out', nodeId: 'a' }));
state.addNode(a);

const b = new Node({ id: 'b', type: 'action', x: 380, y: 160 });
b.addPort(new Port({ id: 'b:in', direction: 'in', nodeId: 'b' }));
state.addNode(b);

// Connect a → b (throws if it would create a cycle or is otherwise invalid)
state.addEdge(new Edge({ id: 'a->b', sourcePortId: 'a:out', targetPortId: 'b:in' }));
```

Users can also connect by dragging from an output port to an input port
(`EdgeRoutingController`). Edges are directed and validated as a **DAG** —
self-loops and cycles are rejected.

Edges accept extra options:

```js
new Edge({
  id: 'e1', sourcePortId: 'a:out', targetPortId: 'b:in',
  type: 'smoothstep',        // 'bezier' (default) | 'straight' | 'step' | 'smoothstep'
  markerEnd: 'arrowclosed',  // 'arrow' | 'arrowclosed' | null
  label: 'on success',
  animated: true,
});
```

## 4. Undo / redo & mutations

Every mutation goes through a command history:

```js
state.setNodePosition('a', 200, 200);   // undoable
state.resizeNode('a', { x: 200, y: 200, width: 240, height: 100 });
state.removeNode('b');

state.commandHistory.undo();
state.commandHistory.redo();
state.commandHistory.canUndo; // boolean
```

`moveNodeDirect` / `resizeNodeDirect` are the non-undoable "live preview"
variants the controllers use during a drag; commit with the undoable versions.

## 5. React to changes

`CanvasState` is an `EventTarget`:

```js
state.addEventListener('node-added',   (e) => console.log(e.detail.node));
state.addEventListener('edge-added',   (e) => console.log(e.detail.edge));
state.addEventListener('selection-changed', (e) => console.log([...e.detail.selectedIds]));
```

Events: `node-added`, `node-removed`, `node-moved`, `node-resized`,
`edge-added`, `edge-removed`, `node-config-updated`, `viewport-changed`,
`selection-changed`, `state-reset`.

You can also pass callbacks to the constructor:

```js
const state = new CanvasState({
  isValidConnection: (sourcePortId, targetPortId) => true,
  onConnect: (s, t) => console.log('connected', s, t),
});
```

## 6. Persistence

```js
const json = state.toJSON();
localStorage.setItem('graph', JSON.stringify(json));

state.loadFromJSON(JSON.parse(localStorage.getItem('graph')));
```

## 7. Extras (optional)

```html
<canvas-background id="bg" type="dots" gap="24"></canvas-background>
<canvas-controls id="controls"></canvas-controls>
<canvas-minimap id="minimap"></canvas-minimap>
```

```js
document.getElementById('bg').state = state;          // grid follows pan/zoom
const controls = document.getElementById('controls');
controls.state = state; controls.workspace = ws;      // zoom / fit / undo / redo
const minimap = document.getElementById('minimap');
minimap.canvasState = state; minimap.visualRegistry = visualRegistry;
```

## Describing node types (registries)

Registries let you describe node types once and reuse them (for palettes, the
minimap colouring, and the config drawer). See
[core-api.md#registries](core-api.md#registries).

```js
import { VisualRegistry, TopologyRegistry, SchemaRegistry } from '@nodeweave/core';

const visual = new VisualRegistry();
visual.register('action', { color: '#4dabf7', label: 'Action' });
```

Next: the [`@nodeweave/core` API reference](core-api.md).
