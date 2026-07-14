import { Node, VisualCanvasService } from '@build744/nodeweave-angular';
import { NodeCatalog } from './node-catalog';

/** MIME type carried by a palette drag so the canvas knows what to create. */
export const NW_DND_TYPE = 'application/x-nodeweave-type';

/**
 * Handle a `drop` on the canvas: read the dragged node type, convert the drop
 * point to flow coordinates, create the node (centred on the cursor), add it,
 * and select it. Returns the created node, or null if the drop wasn't a palette
 * drag. Call from a `(drop)` handler on the `<nodeweave>` element.
 */
export function nodeFromDrop(
  catalog: NodeCatalog,
  service: VisualCanvasService,
  event: DragEvent,
): Node | null {
  event.preventDefault();
  const type = event.dataTransfer?.getData(NW_DND_TYPE);
  if (!type) return null;
  const def = catalog.get(type);
  if (!def) return null;

  const p = service.screenToFlowPosition({ x: event.clientX, y: event.clientY });
  const node = catalog.createNode(
    type,
    p.x - (def.width ?? 200) / 2,
    p.y - (def.height ?? 90) / 2,
  );
  service.addNode(node);
  service.selectNode(node.id);
  return node;
}

/** Allow the drop by preventing default on `dragover` and setting the effect. */
export function allowNodeDrop(event: DragEvent): void {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
}
