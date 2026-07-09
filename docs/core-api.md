# @nodeweave/core — API reference

## Entry points

| Import | Contents |
|--------|----------|
| `@nodeweave/core` | Everything, and registers the `<canvas-*>` Web Components |
| `@nodeweave/core/core` | Engine only — `CanvasState`, `Node`, `Edge`, `Port`, `CommandHistory`, `PipelineBuilder`, `RuleEvaluator`, `ViewportCulling`, edge-path helpers |
| `@nodeweave/core/controllers` | Interaction controllers + `ControllerOptions` |
| `@nodeweave/core/registries` | `Registry`, `VisualRegistry`, `TopologyRegistry`, `SchemaRegistry` |
| `@nodeweave/core/components` | Registers the `<canvas-*>` Web Components |

---

## Graph model

### `Port`

```ts
new Port({ id: string; direction: 'in' | 'out'; nodeId: string; positionHint?: 'top'|'bottom'|'left'|'right' })
```
Immutable (frozen). Read-only: `id`, `direction`, `nodeId`, `positionHint`. `toJSON()`.

### `Node`

```ts
new Node({ id: string; type: string; metadata?: object; x?: number; y?: number })
```
- Read-only: `id`, `type`, `metadata`, `ports` (`Map<string, Port>`)
- Mutable: `x`, `y`, `width` (default `180`), `height` (default `60`)
- `addPort(port: Port): void`, `toJSON()`

### `Edge`

```ts
new Edge({
  id: string; sourcePortId: string; targetPortId: string;
  type?: 'bezier' | 'straight' | 'step' | 'smoothstep';   // default 'bezier'
  label?: string;
  animated?: boolean;                                       // default false
  markerEnd?: 'arrow' | 'arrowclosed' | null;               // default null
})
```
Immutable (frozen). Read-only getters for each field. `toJSON()`.

---

## `CanvasState`

The single source of truth; extends `EventTarget`.

```ts
new CanvasState(options?: CanvasStateOptions)

interface CanvasStateOptions {
  onConnect?: (sourcePortId, targetPortId) => void;      // after an edge is added
  isValidConnection?: (sourcePortId, targetPortId) => boolean; // veto a connection
  onNodesChange?: () => void;
  onEdgesChange?: () => void;
}
```

### Getters
`nodes: Map<string, Node>` · `edges: Map<string, Edge>` · `viewport: { panX; panY; zoom }` · `selectedNodeIds: Set<string>` · `commandHistory: CommandHistory`

### Mutations (undoable)
```ts
addNode(node) · removeNode(id)
setNodePosition(id, x, y) · setNodePositions(Map<id,{x,y}>)
resizeNode(id, { x, y, width, height })
addEdge(edge) · removeEdge(id)
updateNodeConfig(id, config)
```

### Non-undoable (live preview / viewport / selection)
```ts
moveNodeDirect(id, x, y) · resizeNodeDirect(id, x, y, width, height)
setViewport(panX, panY, zoom)
selectNode(id) · toggleNodeSelection(id) · selectNodes(ids[]) · clearSelection()
```

### Clipboard, queries, serialization
```ts
copySelection() · paste() · duplicate()
getPort(id): Port | null · hasCycle(): boolean
toJSON() · loadFromJSON(json) · clear()
CanvasState.fromJSON(json, options?)   // static
```

### Events
`node-added`, `node-removed`, `node-moved`, `node-resized`, `edge-added`,
`edge-removed`, `node-config-updated`, `viewport-changed`, `selection-changed`,
`state-reset`. Each is a `CustomEvent`; inspect `event.detail`.

### `CommandHistory`
`execute(command)` · `undo()` · `redo()` · `canUndo` · `canRedo` · `clear()`.
Access via `state.commandHistory`.

---

## Edge paths

Pure functions returning an SVG path `d` string. Assume a left→right flow
(source = an `out` port on the right, target = an `in` port on the left).

```ts
getStraightPath(source, target): string
getBezierPath(source, target, { minBow?, maxBow? }?): string
getStepPath(source, target): string
getSmoothStepPath(source, target, { borderRadius? }?): string
getEdgeCenter(source, target): { x, y }
buildEdgePath(type, source, target, options?): string   // dispatches by edge type
```
`Point = { x: number; y: number }`.

## `ViewportCulling`
```ts
ViewportCulling.getVisibleNodes(state, { x, y, width, height }): string[]
```
Returns the ids of nodes whose bounding box intersects the (canvas-space) rect.

## `PipelineBuilder`
Fluent DAG builder: `addJob(id, name, stage?)` → `JobContext` with
`.dependsOn(...ids)`; `.build(): CanvasState`.

## `RuleEvaluator`
```ts
RuleEvaluator.evaluate(rule, state): boolean
```
Supports `$and` / `$or` and field rules with operators `equals`, `notEquals`,
`in`, `notIn`, `exists`, `notExists`. Used by the config drawer's `showIf`.

---

## Registries

`Registry<T>`: `register(key, def)` · `get(key)` (throws if missing) ·
`has(key)` · `getAll()` · `keys()` · `size`.

```ts
// VisualRegistry — appearance (palette, minimap colour)
visual.register('action', { color: '#4dabf7', label: 'Action', icon?: '…' });

// TopologyRegistry — which ports a node type has
topology.register('gate', {
  inputs:  [{ id: 'in', label?: 'In', position?: 'left', dataType?: 'any' }],
  outputs: [{ id: 'true' }, { id: 'false' }],
});

// SchemaRegistry — the config-drawer form
schema.register('action', {
  fields: {
    url: { type: 'string', label: 'URL', placeholder?: 'https://…' },
    method: { type: 'select', label: 'Method', options: ['GET','POST'] },
    body: { type: 'textarea', label: 'Body', showIf: { field: 'method', operator: 'equals', value: 'POST' } },
  },
});
```
`SchemaField.type`: `string | number | select | textarea | boolean | list`
(with optional `default`, `options`, `showIf`, `itemSchema`, `placeholder`,
`min`, `max`, `step`, `rows`).

Registries describe node types; your app uses them (e.g. to build a node's
ports from its topology). The minimap reads `VisualRegistry`; the config drawer
reads a `SchemaDefinition`.

---

## Controllers

All take `(workspace, canvasState, …)`, expose `attach()` / `detach()`, and
locate elements via CSS selectors so they work with any renderer.

```ts
interface ControllerOptions {
  nodeSelector: string;    // e.g. 'canvas-node'
  portSelector: string;    // e.g. 'canvas-port'
  snapGrid?: [number, number];
  onConnect?: (sourcePortId, targetPortId) => void;
  isValidConnection?: (sourcePortId, targetPortId) => boolean;
  onNodeDrag?: (nodeId, x, y) => void;
  onNodeDragStop?: (nodeId, x, y) => void;
}
```

| Controller | Constructor | Notes |
|------------|-------------|-------|
| `DragController` | `(ws, state, options)` | move nodes; `snapToGrid`, `gridSize` fields; snaps with Shift |
| `PanZoomController` | `(ws, state)` | wheel zoom (0.1–3×), space/middle-drag pan |
| `SelectionController` | `(ws, state, options)` | click + rubber-band select |
| `EdgeRoutingController` | `(ws, state, edgeLayer, options)` | connect by dragging port→port |
| `KeyboardController` | `(ws, state, options)` | arrows nudge, Delete, Ctrl+Z/Y/A/C/V/D, Esc |
| `ResizeController` | `(ws, state, options?)` | 8 handles; `minWidth`, `minHeight` fields |

---

## Web Components

| Element | Key API |
|---------|---------|
| `<canvas-workspace>` | `.state = CanvasState` — renders nodes + an internal `<canvas-edge-layer>` |
| `<canvas-node>` | props `nodeId`, `nodeKind`, `label`, `ports`, `state`; `setPosition(x,y)`, `setSize(w,h)` |
| `<canvas-port>` | props `portId`, `direction`, `nodeId` |
| `<canvas-edge-layer>` | `.state`; `_getPortPosition(portId)`; renders edge paths, markers, labels |
| `<canvas-minimap>` | `.canvasState`, `.visualRegistry`; `render()` |
| `<config-drawer>` | `open(nodeId, type, config?)`, `close()`, `renderForm(schema, config?)`; emits `node-config-updated` |
| `<canvas-background>` | attrs/props `type` (`dots`\|`lines`\|`cross`), `gap`, `size`, `color`; `.state` to follow the viewport |
| `<canvas-controls>` | `.state`, `.workspace`; `zoomIn()`, `zoomOut()`, `fitView()`, `undo()`, `redo()`; `<slot>` for custom buttons |

All are themed via [`--vc-*` CSS variables](theming.md).
