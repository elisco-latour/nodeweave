# @build744/angular-authoring

Catalog-driven authoring UX for [nodeweave](../../README.md) — a palette, a
schema-driven inspector, and drag-to-create for the Angular canvas.

## Install

```bash
pnpm add @build744/angular-authoring @build744/angular @build744/core
```

Requires Angular `^22` and `rxjs ^7`.

## What's inside

- **`NodeCatalog`** — declare node types (label, ports, config schema, component)
  and create nodes from them.
- **`NwInspectorComponent`** — a schema-driven property inspector for the
  selected node.
- **Drag-to-create helpers** — `nodeFromDrop`, `allowNodeDrop`, and the
  `NW_DND_TYPE` drag payload for a palette → canvas workflow.

## Usage

```ts
import { NodeCatalog, NwInspectorComponent, nodeFromDrop, allowNodeDrop, NW_DND_TYPE } from '@build744/angular-authoring';

const catalog = new NodeCatalog([
  { type: 'task', label: 'Task', ports: ['in', 'out'], component: MyNodeComponent, configSchema: { fields: { title: { type: 'string', label: 'Title' } } } },
]);
```

See the docs site and `examples/angular` for a full authoring canvas.

## License

ISC
