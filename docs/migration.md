# Coming from React Flow

nodeweave will feel familiar if you've used React Flow (or xyflow). The biggest
differences: the core is **framework-agnostic** (React Flow is React-only), the
graph is a **validated DAG** (cycles are rejected), and **undo/redo is built in**
via a command history.

## Concept map

| React Flow | nodeweave |
|------------|-----------|
| `<ReactFlow nodes edges>` | `CanvasState` + `<canvas-workspace>` (vanilla) or `<nodeweave>` (Angular) |
| `nodeTypes` | `nodeTypes` input on `<nodeweave>` (Angular components) |
| `<Handle>` | `Port` (rendered as `canvas-port` / `[data-vc-port]`) |
| `onConnect` | `CanvasState({ onConnect })`, the `connect` output, or `EdgeRoutingController`'s `onConnect` |
| `isValidConnection` | `CanvasState({ isValidConnection })` / `ControllerOptions.isValidConnection` |
| `useNodes()` / `useEdges()` | `service.nodes()` / `service.edges()` signals (Angular) or `CanvasState` events (vanilla) |
| `useReactFlow()` | inject `VisualCanvasService` (or hold the `CanvasState`) |
| `<Background variant="dots">` | `<canvas-background type="dots">` |
| `<Controls>` | `<canvas-controls>` |
| `<MiniMap>` | `<canvas-minimap>` |
| `fitView()` | `controls.fitView()` (on `<canvas-controls>`) |
| edge `type` (`smoothstep`, …) | `Edge.type` (`bezier` / `straight` / `step` / `smoothstep`) |
| `markerEnd` | `Edge.markerEnd` (`'arrow'` / `'arrowclosed'`) |
| animated edges | `Edge.animated` |
| `snapToGrid` | `snapToGrid` input / `ControllerOptions.snapGrid` |
| controlled `nodes`/`edges` state | mutations on `CanvasState`; read back via signals/events |

## Key differences

- **DAG-only.** `addEdge` rejects self-loops and anything that would create a
  cycle. If you need arbitrary graphs, that constraint won't fit.
- **Command history.** Add / move / resize / remove / paste are undoable out of
  the box (`state.commandHistory.undo()`), no reducer wiring.
- **Immutable edges.** Set `type` / `label` / `animated` / `markerEnd` when you
  construct an `Edge`; to change one, replace it.
- **Framework-agnostic core.** The engine + controllers are DOM-level and
  renderer-agnostic; `@build744/nodeweave-angular` is one binding. React/Svelte bindings
  can be built the same way (drive the engine, render your view).
- **Ports vs handles.** Ports have a `direction` (`in` / `out`) and belong to a
  node; edges connect an out-port to an in-port.

## Porting a component (React Flow → Angular)

```tsx
// React Flow
<ReactFlow nodes={nodes} edges={edges} nodeTypes={{ task: TaskNode }} onConnect={onConnect} fitView />
```

```ts
// nodeweave + Angular
@Component({
  imports: [VisualCanvasComponent],
  template: `<nodeweave #cv [nodeTypes]="nodeTypes" (connect)="onConnect($event)"></nodeweave>`,
})
export class Flow {
  nodeTypes = { task: TaskNodeComponent };
  // seed nodes/edges via cv.service.addNode(...) / loadFromJSON(...)
  onConnect(e: { source: string; target: string }) { /* … */ }
}
```

See the [Angular guide](angular.md) for the full component and service API.
