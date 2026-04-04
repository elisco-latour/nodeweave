export class ViewportCulling {
  /**
   * Returns array of node IDs whose bounding box intersects the viewport.
   * @param {import('./canvas-state.js').CanvasState} canvasState
   * @param {{ x: number, y: number, width: number, height: number }} viewportBounds — in canvas coordinates
   * @returns {string[]}
   */
  static getVisibleNodes(canvasState, viewportBounds) {
    const { x: vx, y: vy, width: vw, height: vh } = viewportBounds;
    const result = [];

    for (const node of canvasState.nodes.values()) {
      const nx = node.x;
      const ny = node.y;
      const nw = node.width;
      const nh = node.height;

      // AABB intersection test
      if (nx + nw > vx && nx < vx + vw && ny + nh > vy && ny < vy + vh) {
        result.push(node.id);
      }
    }

    return result;
  }
}
