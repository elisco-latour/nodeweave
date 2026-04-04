---
name: interaction-controllers
description: "Pointer and keyboard interaction controllers that translate user input into Commands. Use when implementing or reviewing DragController, PanZoomController, SelectionController, EdgeRoutingController, KeyboardController, coordinate conversion, or snap-to-grid. Covers: setPointerCapture, requestAnimationFrame batching, screen-to-canvas coordinate transform, rubber-band selection, phantom edge routing, keyboard shortcuts."
---

# Interaction Controllers

All user interactions are handled by **controller classes** that translate pointer/keyboard events into Commands.

## Design Principles
- Controllers are plain classes, NOT Web Components
- Each controller is instantiated by `<canvas-workspace>` and given references to `CanvasState`, `CommandHistory`, and the DOM element to listen on
- Controllers attach event listeners in `attach()` and remove them in `detach()`
- Controllers NEVER directly mutate `CanvasState` — they create Command objects and execute them via `CommandHistory`
- Multiple controllers can coexist on the same element; they use event properties (button, modifiers) to disambiguate

## Controller Inventory

### `DragController`
- **Trigger:** `pointerdown` on a `<canvas-node>` (button 0)
- **Behavior:**
  - `pointerdown`: record start position, set `setPointerCapture()`
  - `pointermove`: compute delta, update node visual position (temporary, NOT through Command)
  - `pointerup`: create `MoveNodeCommand` with final delta, execute via CommandHistory, `releasePointerCapture()`
- **Multi-select drag:** if multiple nodes selected, move all selected nodes together. Single `MoveNodeCommand` wraps all position changes.
- **Snap-to-grid:** (Phase 6) if `snapToGrid` enabled, round final position

### `PanZoomController`
- **Pan trigger:** `pointerdown` (button 1, middle-click) OR `pointerdown` on empty canvas (button 0)
- **Zoom trigger:** `wheel` event
- **Pinch trigger:** check for 2-touch `pointerdown` events, compute distance delta
- **Behavior:**
  - Pan: update `CanvasState.viewport.panX/panY` directly (non-undoable)
  - Zoom: update `CanvasState.viewport.zoom`, clamped to `[0.1, 5.0]`
  - Zoom targets pointer position (zoom toward cursor)
- **Zoom formula:** `newZoom = oldZoom * (1 + delta * 0.001)`, clamped

### `SelectionController`
- **Click:** `pointerdown` on node → select (clear others unless Shift held)
- **Shift+click:** toggle node in selection
- **Click empty canvas:** clear selection
- **Rubber-band:** `pointerdown` on empty canvas (button 0, no modifier) + drag → draw selection rectangle, select all nodes intersecting it on `pointerup`
- **Rubber-band visual:** a `<div>` with dashed border, positioned and sized during drag

### `EdgeRoutingController`
- **Trigger:** `pointerdown` on a `<canvas-port>` output element
- **Behavior:**
  - Start: record source port, begin phantom edge rendering
  - `pointermove`: update phantom edge endpoint to current pointer position (in canvas coordinates)
  - `pointerup` on valid input port: execute `AddEdgeCommand`
  - `pointerup` elsewhere or `Escape`: cancel, remove phantom edge
- **Coordinate conversion:** screen coordinates → canvas coordinates using viewport inverse transform

### `KeyboardController`
- Attached to `<canvas-workspace>` (must be focusable: `tabindex="0"`)
- Keybindings:
  - `Delete` / `Backspace` — remove selected nodes (via `RemoveNodeCommand` for each)
  - `Ctrl+Z` / `Cmd+Z` — undo
  - `Ctrl+Shift+Z` / `Cmd+Shift+Z` — redo
  - `Ctrl+A` / `Cmd+A` — select all nodes
  - `Escape` — clear selection, cancel in-progress edge routing
  - `Tab` — cycle focus through nodes
  - `Arrow keys` — nudge selected nodes by 1px (10px with Shift)
  - (Phase 6) `Ctrl+C/V/D` — copy/paste/duplicate

## Coordinate Conversion
Screen to canvas:
```js
canvasX = (screenX - panX) / zoom;
canvasY = (screenY - panY) / zoom;
```
Canvas to screen:
```js
screenX = canvasX * zoom + panX;
screenY = canvasY * zoom + panY;
```

## Event Flow
1. User performs physical interaction (pointer, keyboard)
2. Controller captures the event
3. Controller creates appropriate Command
4. Command executed via `CommandHistory.execute(command)`
5. Command mutates `CanvasState`
6. `CanvasState` dispatches domain event
7. Web Components update their rendering in response to event
