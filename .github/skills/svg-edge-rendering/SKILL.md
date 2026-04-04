---
name: svg-edge-rendering
description: "SVG cubic Bezier edge rendering for the canvas-edge-layer Web Component. Use when implementing or reviewing edge paths, phantom edges during edge creation, port offset calculations, or edge layer performance. Covers: Bezier control point formula, position from CanvasState (not DOM measurement), pointer-events:none overlay, phantom dashed edge, selective path updates on node-moved."
---

# SVG Edge Rendering

Edges are rendered as **SVG cubic Bezier paths** in an overlay `<svg>` element.

## Architecture
- `<canvas-edge-layer>` is a Web Component containing a single `<svg>` element
- The SVG is sized to fill the entire canvas workspace (100% × 100%)
- Each edge is a `<path>` element inside the SVG
- The SVG sits on top of nodes but has `pointer-events: none` (edges don't intercept clicks by default)

## Position Calculation
Edge endpoints are calculated **from CanvasState data**, NOT from DOM measurement:
1. Source node position: `canvasState.getNode(edge.sourceNodeId)` → `{ x, y, width, height }`
2. Source port offset: computed from port index and node dimensions
3. Target node position + target port offset: same approach
4. No `getBoundingClientRect()` — positions are always in canvas coordinate space

### Port Offset Formula
- Output ports: right side of node → `x = nodeX + nodeWidth`, `y = nodeY + portOffsetY`
- Input ports: left side of node → `x = nodeX`, `y = nodeY + portOffsetY`
- `portOffsetY = headerHeight + (portIndex * portSpacing) + portSpacing/2`

## Cubic Bezier Path
```
M sourceX,sourceY C cp1X,cp1Y cp2X,cp2Y targetX,targetY
```
- Control point 1: `(sourceX + offset, sourceY)` — extends right from source
- Control point 2: `(targetX - offset, targetY)` — extends left into target
- `offset = Math.min(Math.abs(targetX - sourceX) * 0.5, 150)` — proportional but capped

## Styling
- Stroke: `var(--vc-edge-color)` (default: `#666`)
- Stroke width: `2px`
- Fill: `none`
- Selected edge: `var(--vc-edge-color-selected)`, stroke width `3px`
- Hover: increase stroke width to `4px` via CSS `:hover` (needs `pointer-events: stroke` on hover)

## Phantom Edge (During Edge Creation)
- While user drags from a port to create a new edge, render a "phantom" path
- Source: the originating port position
- Target: follows the pointer position (converted to canvas coordinates)
- Style: dashed stroke (`stroke-dasharray: 6 4`)
- On drop onto valid port: execute `AddEdgeCommand`
- On drop onto empty space or invalid target: remove phantom

## Event Subscriptions
`<canvas-edge-layer>` subscribes to:
- `'node-moved'` — recalculate affected edges
- `'edge-added'` — add new `<path>` element
- `'edge-removed'` — remove `<path>` element
- `'viewport-changed'` — apply transform to SVG group

## Performance
- Use a single `<g>` element with `transform` for pan/zoom instead of recalculating every path
- On `'node-moved'`, only update paths connected to the moved node (not all paths)
- Use `setAttribute('d', ...)` to update path data — avoid recreating elements
