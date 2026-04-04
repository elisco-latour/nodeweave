---
name: canvas-state-management
description: "CanvasState extends EventTarget as the single source of truth for the pipeline graph. Use when working on CanvasState, CommandHistory, Commands, viewport, selection, or any code that reads/writes graph state. Covers: node-moved event (replaces broken ResizeObserver), Command pattern with execute/undo, event catalog, viewport and selection (non-undoable), toJSON/fromJSON serialization."
---

# Canvas State Management

`CanvasState` is the **single source of truth** for the entire pipeline graph.

## Architecture
- `CanvasState` extends `EventTarget`
- All mutations go through **Commands** executed via `CommandHistory`
- Direct mutation of `CanvasState` internals is forbidden from outside

## CanvasState Data
- `#nodes` — `Map<string, NodeData>` (id → `{ id, type, x, y, width, height, config }`)
- `#edges` — `Map<string, EdgeData>` (id → `{ id, sourceNodeId, sourcePortId, targetNodeId, targetPortId }`)
- `#viewport` — `{ panX, panY, zoom }` (non-undoable)
- `#selection` — `Set<string>` of selected node IDs (non-undoable)

## Event System
Events dispatched by `CanvasState` (all are `CustomEvent` with `detail`):
- `'node-added'` — `{ node }`
- `'node-removed'` — `{ node }`
- `'node-moved'` — `{ nodeId, x, y }` — **critical**: this replaces ResizeObserver
- `'node-config-updated'` — `{ nodeId, config }`
- `'edge-added'` — `{ edge }`
- `'edge-removed'` — `{ edge }`
- `'selection-changed'` — `{ selectedIds }`
- `'viewport-changed'` — `{ panX, panY, zoom }`

Components subscribe to these events and update their rendering accordingly.

## Why Not ResizeObserver?
**`ResizeObserver` does NOT fire when an element is moved via `transform: translate()`** — it only observes size changes. Since nodes are positioned with `transform`, we use explicit `'node-moved'` events from `CanvasState.setNodePosition()`.

## CommandHistory
- `execute(command)` — calls `command.execute()`, pushes to undo stack, clears redo stack
- `undo()` — pops from undo stack, calls `command.undo()`, pushes to redo stack
- `redo()` — pops from redo stack, calls `command.execute()`, pushes to undo stack
- `canUndo` / `canRedo` — boolean getters
- Dispatches `'history-changed'` event after every operation

## Command Interface
Every command must implement:
- `execute()` — perform the mutation on `CanvasState`
- `undo()` — reverse the mutation exactly

Commands:
- `AddNodeCommand`, `RemoveNodeCommand`, `MoveNodeCommand`
- `AddEdgeCommand`, `RemoveEdgeCommand`
- `UpdateNodeConfigCommand`
- (Phase 6) `CopyCommand`, `PasteCommand`

## Viewport & Selection
- Viewport changes (pan, zoom) are NOT undoable — they modify `#viewport` directly
- Selection changes are NOT undoable — they modify `#selection` directly
- Both still dispatch events for UI updates

## Serialization
- `toJSON()` — returns `{ nodes: [...], edges: [...] }` (viewport and selection excluded)
- `fromJSON(data)` — clears state and rebuilds from serialized data
- Round-trip: `fromJSON(JSON.parse(JSON.stringify(toJSON())))` must produce identical graph
