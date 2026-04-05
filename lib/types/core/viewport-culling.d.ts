export class ViewportCulling {
    /**
     * Returns array of node IDs whose bounding box intersects the viewport.
     * @param {import('./canvas-state.js').CanvasState} canvasState
     * @param {{ x: number, y: number, width: number, height: number }} viewportBounds — in canvas coordinates
     * @returns {string[]}
     */
    static getVisibleNodes(canvasState: import("./canvas-state.js").CanvasState, viewportBounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    }): string[];
}
