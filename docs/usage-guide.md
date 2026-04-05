# Using the Visual Canvas Library

## JavaScript Project

No build step needed — the library is vanilla ES modules.

```js
import { CanvasState, Node, Port, Edge, PipelineBuilder } from 'visual-canvas/lib/index.js';

// Or use individual entry points:
import { CanvasState } from 'visual-canvas/lib/core.js';
import { DragController } from 'visual-canvas/lib/controllers.js';
import { VisualRegistry } from 'visual-canvas/lib/registries.js';
```

Make sure the consuming project can resolve the import (e.g. via a `node_modules` symlink, npm/pnpm workspace, or a relative path).

## TypeScript Project

Same imports — TypeScript will automatically pick up the `.d.ts` files from `lib/types/` because `package.json` declares `"types": "lib/types/index.d.ts"`. You get full autocomplete, type checking, and hover docs out of the box:

```ts
import { CanvasState, Node, Port, Edge } from 'visual-canvas';

const state = new CanvasState();
//    ^? CanvasState — fully typed, with Map<string, Node>, Viewport, etc.

state.addNode(new Node({ id: 'n1', type: 'job' }));
state.setViewport(0, 0, 1.5);
```

## Installation Options

| Method | Command |
|---|---|
| **pnpm workspace** (monorepo) | Add `"visual-canvas": "workspace:*"` to the consumer's `package.json` |
| **Local link** | `pnpm link /path/to/visual-canvas` in the consumer project |
| **Git dependency** | `"visual-canvas": "git+https://your-repo.git"` in `package.json` |
| **npm publish** (later) | `pnpm publish` then `pnpm add visual-canvas` |

For any of these, run `pnpm run types` first to ensure `lib/types/` is up to date before consuming.
