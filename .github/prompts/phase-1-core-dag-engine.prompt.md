# Phase 1 — Core DAG Engine

**Depends on:** Phase 0 (all tasks complete)

**Agents:** `domain-engineer`, `test-engineer`

**Skills:** `dag-domain-model`, `canvas-state-management`, `vanilla-js-conventions`

**Constraint:** This phase is pure logic. No file in this phase may reference `document`, `window`, `HTMLElement`, or any browser API. Everything must be testable via `node --test`.

---

## Task 1.1 — Implement `Port` class

Create or add to `lib/core/graph.js`.

`Port`:
- Constructor: `{ id, direction, nodeId, positionHint }` where `direction` is `'in'` or `'out'`, `positionHint` is `'top'` | `'bottom'` | `'left'` | `'right'`
- Immutable after construction (use `Object.freeze` or only getters)
- `toJSON()` — returns a plain object representation

**Agent:** `domain-engineer`

**Acceptance:**
- `Port` is a named export from `lib/core/graph.js`
- Constructing with invalid direction throws
- `toJSON()` round-trips correctly

---

## Task 1.2 — Implement `Node` class

Add to `lib/core/graph.js`.

`Node`:
- Constructor: `{ id, type, metadata, x, y }` where `metadata` is a generic object
- `ports` — a `Map<portId, Port>` (initially empty, populated via `addPort()`)
- `addPort(port)` — adds a `Port` instance, throws if duplicate ID
- `x`, `y` — mutable position coordinates (default `0, 0`)
- `width`, `height` — mutable dimensions (default `180, 60`)
- `toJSON()` — returns plain object including ports array

**Agent:** `domain-engineer`

**Acceptance:**
- `Node` is a named export from `lib/core/graph.js`
- `addPort()` validates port's `nodeId` matches this node's `id`
- `toJSON()` serializes ports correctly

---

## Task 1.3 — Implement `Edge` class

Add to `lib/core/graph.js`.

`Edge`:
- Constructor: `{ id, sourcePortId, targetPortId }`
- Immutable after construction
- `toJSON()` — returns plain object

**Agent:** `domain-engineer`

**Acceptance:**
- `Edge` is a named export from `lib/core/graph.js`
- `toJSON()` round-trips correctly

---

## Task 1.4 — Unit tests for `Port`, `Node`, `Edge`

Create `tests/unit/graph.test.js`.

Test cases:
- `Port`: valid construction, invalid direction throws, `toJSON()` round-trip
- `Node`: construction with defaults, `addPort()` success, `addPort()` duplicate throws, `addPort()` wrong nodeId throws, `toJSON()` with ports
- `Edge`: valid construction, `toJSON()` round-trip

**Agent:** `test-engineer`

**Acceptance:**
- `node --test tests/unit/graph.test.js` — all pass

---

## Task 1.5 — Implement `CanvasState` event system

Create `lib/core/canvas-state.js`.

`CanvasState` extends `EventTarget` (native browser/Node.js API):
- Constructor: initializes `nodes` Map, `edges` Map, `viewport` object `{ panX: 0, panY: 0, zoom: 1 }`, `selectedNodeIds` Set
- Private `_commandHistory` — a `CommandHistory` instance
- `get commandHistory()` — exposes read-only access for UI binding (`canUndo`, `canRedo`)

This task ONLY implements the event system and basic structure. Node/edge mutations are separate tasks.

**Agent:** `domain-engineer`

**Skills:** `canvas-state-management`

**Acceptance:**
- `CanvasState` is a named export
- `new CanvasState()` creates an instance with empty maps and default viewport
- `addEventListener` / `dispatchEvent` work (inherited from `EventTarget`)

---

## Task 1.6 — Implement `AddNodeCommand`

Add to `lib/core/canvas-state.js` (or a separate `lib/core/commands/add-node-command.js`).

`AddNodeCommand`:
- Constructor: `(canvasState, node)`
- `execute()` — adds node to `canvasState.nodes`, dispatches `'node-added'` CustomEvent with `{ detail: { nodeId } }`
- `undo()` — removes node from `canvasState.nodes`, dispatches `'node-removed'` CustomEvent

Expose on `CanvasState`:
- `addNode(node)` — creates and executes `AddNodeCommand` via `commandHistory`

**Agent:** `domain-engineer`

**Acceptance:**
- `state.addNode(node)` adds node and fires event
- `state.commandHistory.undo()` removes it and fires event

---

## Task 1.7 — Implement `RemoveNodeCommand`

`RemoveNodeCommand`:
- Constructor: `(canvasState, nodeId)`
- `execute()` — removes node, also removes all edges connected to any of its ports, dispatches `'node-removed'` and `'edge-removed'` events
- `undo()` — re-adds node and its edges, dispatches `'node-added'` and `'edge-added'` events

Expose on `CanvasState`:
- `removeNode(nodeId)` — creates and executes `RemoveNodeCommand`

**Agent:** `domain-engineer`

**Acceptance:**
- Removing a node also removes connected edges
- Undo restores both node and its edges

---

## Task 1.8 — Implement `MoveNodeCommand`

`MoveNodeCommand`:
- Constructor: `(canvasState, nodeId, newX, newY)`
- Captures `oldX`, `oldY` from current node position
- `execute()` — sets node `x`, `y` to new values, dispatches `'node-moved'` CustomEvent with `{ detail: { nodeId, x: newX, y: newY } }`
- `undo()` — sets node `x`, `y` to old values, dispatches `'node-moved'`

Expose on `CanvasState`:
- `setNodePosition(nodeId, x, y)` — creates and executes `MoveNodeCommand`

**This is the critical event that replaces `ResizeObserver`.** The SVG edge layer subscribes to `'node-moved'` to recalculate paths.

**Agent:** `domain-engineer`

**Skills:** `canvas-state-management`

**Acceptance:**
- `state.setNodePosition(id, 100, 200)` updates node and fires `'node-moved'`
- Undo restores previous position and fires `'node-moved'` with old coords

---

## Task 1.9 — Implement `AddEdgeCommand`

`AddEdgeCommand`:
- Constructor: `(canvasState, edge)`
- `execute()` validates: source port exists, target port exists, source port direction is `'out'`, target port direction is `'in'`, no self-loops (source node ≠ target node). Then adds edge, dispatches `'edge-added'`
- `undo()` — removes edge, dispatches `'edge-removed'`

Expose on `CanvasState`:
- `addEdge(edge)` — creates and executes `AddEdgeCommand`

**Agent:** `domain-engineer`

**Acceptance:**
- Invalid edges (wrong direction, self-loop, missing port) throw during `execute()`
- Valid edges are added and fire events
- Undo removes and fires events

---

## Task 1.10 — Implement `RemoveEdgeCommand`

`RemoveEdgeCommand`:
- Constructor: `(canvasState, edgeId)`
- `execute()` — removes edge, dispatches `'edge-removed'`
- `undo()` — re-adds edge, dispatches `'edge-added'`

Expose on `CanvasState`:
- `removeEdge(edgeId)` — creates and executes `RemoveEdgeCommand`

**Agent:** `domain-engineer`

**Acceptance:**
- Removing nonexistent edge throws
- Undo restores the edge

---

## Task 1.11 — Implement viewport and selection

Add to `CanvasState`:
- `setViewport(panX, panY, zoom)` — updates viewport, dispatches `'viewport-changed'`
- `selectNode(nodeId)` — clears selection, adds nodeId, dispatches `'selection-changed'`
- `toggleNodeSelection(nodeId)` — toggles nodeId in set, dispatches `'selection-changed'`
- `clearSelection()` — clears set, dispatches `'selection-changed'`
- `selectNodes(nodeIds)` — replaces selection set, dispatches `'selection-changed'`

Viewport and selection changes do NOT go through `CommandHistory` (they are view-only state, not undoable).

**Agent:** `domain-engineer`

**Acceptance:**
- Viewport updates fire events with new values
- Selection methods correctly manage the Set
- These operations do NOT appear in undo stack

---

## Task 1.12 — Implement `toJSON()` / `fromJSON()`

Add to `CanvasState`:
- `toJSON()` — serializes `{ nodes: [...], edges: [...], viewport: {...} }` using each entity's `toJSON()`
- `static fromJSON(json)` — creates a new `CanvasState`, hydrates nodes (with ports) and edges, sets viewport. Does NOT use `CommandHistory` for hydration (these are not undoable operations).

**Agent:** `domain-engineer`

**Acceptance:**
- `CanvasState.fromJSON(state.toJSON())` produces an identical state
- Round-trip preserves node positions, ports, edges, and viewport

---

## Task 1.13 — Implement cycle detection

Add to `CanvasState`:
- `hasCycle()` — performs a topological sort (Kahn's algorithm or DFS) on the current graph. Returns `true` if a cycle exists.
- `addEdge()` should call `hasCycle()` after tentatively adding the edge. If a cycle is detected, roll back the edge addition and throw an error.

**Agent:** `domain-engineer`

**Skills:** `dag-domain-model`

**Acceptance:**
- Adding an edge that creates a cycle throws and leaves the graph unchanged
- Linear chains and fan-out/fan-in graphs pass validation

---

## Task 1.14 — Implement `PipelineBuilder` fluent API

Create `lib/core/pipeline-builder.js`.

`PipelineBuilder`:
- Constructor: creates a temporary staging area (not a `CanvasState` yet)
- `addJob(id, name, stage)` — returns a `JobContext`
- `JobContext.dependsOn(...parentIds)` — records dependency (returns `this`)
- `JobContext.addJob(...)` — delegates back to builder (enables chaining)
- `build()` — creates a `CanvasState`, auto-assigns x/y based on stage columns, creates nodes with ports, creates edges from dependencies, returns the `CanvasState`

**Agent:** `domain-engineer`

**Acceptance:**
- Fluent chain produces a valid `CanvasState` with correct edges
- Referencing nonexistent parent in `dependsOn` throws at build time
- Circular dependency throws at build time

---

## Task 1.15 — Unit tests for `CanvasState`

Create `tests/unit/canvas-state.test.js`.

Test cases:
- Add node, verify it exists in nodes Map
- Add node then undo, verify removed
- Move node, verify coordinates updated and event fired
- Move node then undo, verify old coordinates restored
- Add edge between valid ports
- Add edge with wrong direction throws
- Add edge creating cycle throws
- Remove node also removes connected edges
- Remove node undo restores node and edges
- Viewport changes fire events but aren't undoable
- Selection management (select, toggle, clear)
- `toJSON()` / `fromJSON()` round-trip

**Agent:** `test-engineer`

**Acceptance:**
- `node --test tests/unit/canvas-state.test.js` — all pass

---

## Task 1.16 — Update `lib/index.js`

Add new exports:
- `Node`, `Port`, `Edge` from `./core/graph.js`
- `CanvasState` from `./core/canvas-state.js`
- `PipelineBuilder` from `./core/pipeline-builder.js`

**Agent:** `architect`

**Acceptance:**
- All Phase 1 classes importable from `lib/index.js`

---

## Phase 1 Completion Checklist

- [ ] `Port`, `Node`, `Edge` classes implemented and tested
- [ ] `CanvasState` with full event system
- [ ] All 5 command types implemented (`AddNode`, `RemoveNode`, `MoveNode`, `AddEdge`, `RemoveEdge`)
- [ ] Viewport and selection (non-undoable)
- [ ] `toJSON()` / `fromJSON()` round-trip
- [ ] Cycle detection blocks invalid edges
- [ ] `PipelineBuilder` fluent API
- [ ] All unit tests pass: `node --test tests/unit/`
- [ ] `lib/index.js` exports all Phase 1 modules
- [ ] Zero DOM references in any Phase 1 file
