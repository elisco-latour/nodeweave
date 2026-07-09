import type { CanvasState } from './canvas-state.js';

export interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class ViewportCulling {
  /** Returns IDs of nodes whose bounding box intersects the given canvas-coordinate bounds. */
  static getVisibleNodes(canvasState: CanvasState, viewportBounds: ViewportBounds): string[] {
    const { x: vx, y: vy, width: vw, height: vh } = viewportBounds;
    const result: string[] = [];

    for (const node of canvasState.nodes.values()) {
      if (node.x + node.width > vx && node.x < vx + vw &&
          node.y + node.height > vy && node.y < vy + vh) {
        result.push(node.id);
      }
    }

    return result;
  }
}
