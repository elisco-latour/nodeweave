# Custom edges

An edge's appearance is driven by fields on the `Edge` itself — set them when
you create it (edges are immutable, so pass everything to the constructor).

```js
import { Edge } from '@build744/core';

new Edge({
  id: 'e1',
  sourcePortId: 'a:out',
  targetPortId: 'b:in',
  type: 'smoothstep',        // 'bezier' (default) | 'straight' | 'step' | 'smoothstep'
  markerEnd: 'arrowclosed',  // 'arrow' | 'arrowclosed' | null
  label: 'on success',       // rendered as a pill at the edge midpoint
  animated: true,            // flowing dashes (respects prefers-reduced-motion)
});
```

## Edge types

| `type` | Shape |
|--------|-------|
| `bezier` | Smooth cubic curve (default) |
| `straight` | Direct line |
| `step` | Orthogonal, sharp corners |
| `smoothstep` | Orthogonal, rounded corners |

All four are produced by the shared path builders so node and Angular
renderers draw identical edges.

## Markers & labels

- `markerEnd: 'arrow'` draws an open arrowhead, `'arrowclosed'` a filled one.
  Markers inherit the edge's stroke colour automatically (SVG `context-stroke`).
- `label: '…'` renders a themed pill at the midpoint (`getEdgeCenter`).

## Animated edges

`animated: true` adds a flowing dash animation. It is automatically disabled
under `@media (prefers-reduced-motion: reduce)`.

## Styling

Edges are plain SVG `<path>`s themed with CSS variables — see
[theming.md](theming.md):

```css
:root {
  --nw-edge-color: #64748b;
  --nw-edge-color-phantom: #94a3b8;   /* the in-progress connection */
  --nw-edge-label-color: #e2e8f0;
}
```

## Building your own paths

The path builders are exported for advanced use — e.g. drawing an overlay,
a custom minimap, or your own edge layer:

```js
import { getBezierPath, getSmoothStepPath, getEdgeCenter, buildEdgePath } from '@build744/core';

const d = getSmoothStepPath({ x: 0, y: 0 }, { x: 200, y: 80 }, { borderRadius: 12 });
const mid = getEdgeCenter({ x: 0, y: 0 }, { x: 200, y: 80 });
```

`buildEdgePath(type, source, target, options?)` dispatches to the right builder.
`options` accepts `{ minBow, maxBow }` (bezier) and `{ borderRadius }`
(smoothstep).

## Fully custom edge rendering

nodeweave controls edge appearance through the fields above rather than
arbitrary per-edge components. If you need something the built-ins don't cover
(e.g. edges with editable waypoints), render your own SVG layer from
`state.edges` and the path helpers, and hide or replace the default layer.
In Angular, that means a component like the built-in `vc-edge-layer` that reads
`service.edges()` and draws with `buildEdgePath`.
