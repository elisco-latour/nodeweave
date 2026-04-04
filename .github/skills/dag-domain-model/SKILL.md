---
name: dag-domain-model
description: "Directed Acyclic Graph domain model for the pipeline editor. Use when implementing or reviewing Node, Port, Edge classes, cycle detection, PipelineBuilder, validation rules, or the three split registries (VisualRegistry, TopologyRegistry, SchemaRegistry). Covers: DAG validation, self-loop and duplicate edge prevention, DFS cycle detection, serialization contract, SRP registry design."
---

# DAG Domain Model

The pipeline graph is a **Directed Acyclic Graph (DAG)**.

## Core Classes

### `Port`
- Properties: `id`, `nodeId`, `direction` (`'input'` | `'output'`), `dataType` (string)
- Port IDs are scoped to their node: `"nodeId:portId"`
- Ports are defined by `TopologyRegistry` per node type

### `NodeData`
- Plain object: `{ id, type, x, y, width, height, config }`
- `id` — unique string (UUID v4 or `crypto.randomUUID()`)
- `type` — string matching a registered node type
- `config` — plain object holding user-configured values

### `EdgeData`
- Plain object: `{ id, sourceNodeId, sourcePortId, targetNodeId, targetPortId }`
- An edge connects one output port to one input port
- Edge ID is a unique string

## Validation Rules
- **No self-loops:** `edge.sourceNodeId !== edge.targetNodeId`
- **No duplicate edges:** same source port → same target port not allowed
- **Port direction:** source must be `'output'`, target must be `'input'`
- **Acyclic:** adding an edge must not create a cycle (use DFS-based cycle detection)
- **Port exists:** both ports must exist on their respective nodes per `TopologyRegistry`

## Cycle Detection
- Before adding an edge, run DFS from `targetNodeId` following existing edges
- If DFS reaches `sourceNodeId`, the edge would create a cycle → reject
- Time complexity: O(V + E) per check

## PipelineBuilder (Fluent API)
```js
const state = new PipelineBuilder()
  .addNode('http-request', { x: 100, y: 100 })  // returns nodeId
  .addNode('json-parser', { x: 300, y: 100 })
  .connect(node1, 'response', node2, 'input')    // portIds
  .build();  // returns CanvasState
```

## Serialization Contract
```json
{
  "nodes": [
    { "id": "abc", "type": "http-request", "x": 100, "y": 100, "width": 180, "height": 80, "config": {} }
  ],
  "edges": [
    { "id": "xyz", "sourceNodeId": "abc", "sourcePortId": "response", "targetNodeId": "def", "targetPortId": "input" }
  ]
}
```

## Three Registries (SRP)

### `VisualRegistry`
- Maps node type → `{ color, icon, label }`
- Used by `<canvas-node>` for rendering

### `TopologyRegistry`
- Maps node type → `{ inputs: [{ id, dataType }], outputs: [{ id, dataType }] }`
- Used by `CanvasState` for validation, by `<canvas-port>` for rendering

### `SchemaRegistry`
- Maps node type → `{ fields: { fieldKey: { type, label, default, showIf?, options?, ... } } }`
- Used by `<config-drawer>` for form generation

All three registries have `register(nodeType, definition)` and `get(nodeType)` methods.
