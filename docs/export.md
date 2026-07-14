# Export & persistence

## JSON (built in)

`CanvasState` serializes to a plain, portable object — nodes (with ports),
edges, and the viewport.

```js
const json = state.toJSON();
localStorage.setItem('graph', JSON.stringify(json));

// restore into an existing state (fires 'state-reset')
state.loadFromJSON(JSON.parse(localStorage.getItem('graph')));

// or build a fresh state
import { CanvasState } from '@build744/core';
const restored = CanvasState.fromJSON(json);
```

In Angular the service wraps the same calls:

```ts
const json = cv.service.toJSON();
cv.service.loadFromJSON(json);
```

### Shape

```jsonc
{
  "nodes": [
    { "id": "a", "type": "task", "x": 80, "y": 80, "width": 180, "height": 60,
      "metadata": {}, "ports": [{ "id": "a:out", "direction": "out", "nodeId": "a", "positionHint": null }] }
  ],
  "edges": [
    { "id": "e1", "sourcePortId": "a:out", "targetPortId": "b:in",
      "type": "bezier", "animated": false, "markerEnd": null }
  ],
  "viewport": { "panX": 0, "panY": 0, "zoom": 1 }
}
```

It's just data — version it, diff it, or send it to a server as you wish.

## PNG / image export

Rendering to an image isn't part of the core (it depends on how you render).
The `examples/vanilla` and `examples/wireframe` apps include a small
`ExportService` that rasterises the graph to a `<canvas>` and downloads a PNG —
copy it as a starting point.

The general recipe:

1. Compute the graph's bounding box from `state.nodes` (min/max of
   `x, y, x+width, y+height`), plus padding.
2. Create an offscreen `<canvas>` of that size.
3. Draw each edge with the path helpers (`buildEdgePath`) and each node as a
   rounded rectangle (use a `VisualRegistry` for colours).
4. `canvas.toBlob()` → download.

Because `toJSON()` already captures everything, you can also export the graph
as JSON and render the image server-side.
