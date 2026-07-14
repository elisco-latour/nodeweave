# Layout

Nodes carry their own `x` / `y` (canvas coordinates). You place them however
you like — manually, with the built-in `PipelineBuilder`, or with an external
layout engine.

## Manual

```js
const n = new Node({ id: 'a', type: 'task', x: 120, y: 80 });
state.addNode(n);

state.setNodePosition('a', 300, 200);          // undoable
state.setNodePositions(new Map([               // batch (one undo step)
  ['a', { x: 300, y: 200 }],
  ['b', { x: 560, y: 200 }],
]));
```

Use `moveNodeDirect(id, x, y)` for non-undoable live updates (what the drag
controller uses each frame), then commit once with `setNodePosition(s)`.

## PipelineBuilder (stage-based DAG)

For pipeline-shaped graphs, `PipelineBuilder` lays jobs out in columns by
stage and wires dependencies into edges — returning a ready `CanvasState`.

```js
import { PipelineBuilder } from '@build744/nodeweave-core';

const state = new PipelineBuilder()
  .addJob('checkout', 'Checkout', 0)
  .addJob('build', 'Build', 1).dependsOn('checkout')
  .addJob('test', 'Test', 2).dependsOn('build')
  .addJob('deploy', 'Deploy', 2).dependsOn('build')
  .build();

workspace.state = state;   // or service.loadFromJSON(state.toJSON()) in Angular
```

Each job becomes a node with an `in` and `out` port; `dependsOn(...)` becomes
edges. `stage` controls the column; rows are assigned within a stage.

## External layout engines (dagre / elk)

nodeweave doesn't bundle a layout engine — compute positions with your library
of choice, then apply them. The graph is a DAG, which maps cleanly onto dagre
or elkjs.

```js
import dagre from '@dagrejs/dagre';

function autoLayout(state) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 80 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of state.nodes.values()) {
    g.setNode(node.id, { width: node.width, height: node.height });
  }
  for (const edge of state.edges.values()) {
    const s = state.getPort(edge.sourcePortId);
    const t = state.getPort(edge.targetPortId);
    if (s && t) g.setEdge(s.nodeId, t.nodeId);
  }

  dagre.layout(g);

  const positions = new Map();
  for (const id of g.nodes()) {
    const { x, y, width, height } = g.node(id);
    positions.set(id, { x: x - width / 2, y: y - height / 2 }); // dagre centers
  }
  state.setNodePositions(positions);   // one undoable step
}
```

The same pattern works with elkjs — read `state.nodes`/`state.edges`, run the
engine, then `setNodePositions`.
