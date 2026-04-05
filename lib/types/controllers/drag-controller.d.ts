/**
 * @typedef {{ node: string, port: string }} DragSelectors
 */
export class DragController {
    /**
     * @param {HTMLElement} workspace
     * @param {import('../core/canvas-state.js').CanvasState} canvasState
     * @param {DragSelectors} selectors
     */
    constructor(workspace: HTMLElement, canvasState: import("../core/canvas-state.js").CanvasState, selectors: DragSelectors);
    /** @type {boolean} */
    snapToGrid: boolean;
    /** @type {number} */
    gridSize: number;
    /** @returns {void} */
    attach(): void;
    /** @returns {void} */
    detach(): void;
    /** @returns {boolean} */
    get isDragging(): boolean;
    #private;
}
export type DragSelectors = {
    node: string;
    port: string;
};
