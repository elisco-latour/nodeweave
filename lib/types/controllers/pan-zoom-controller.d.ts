export class PanZoomController {
    /**
     * @param {HTMLElement} workspace
     * @param {import('../core/canvas-state.js').CanvasState} canvasState
     */
    constructor(workspace: HTMLElement, canvasState: import("../core/canvas-state.js").CanvasState);
    /** @returns {void} */
    attach(): void;
    /** @returns {void} */
    detach(): void;
    #private;
}
