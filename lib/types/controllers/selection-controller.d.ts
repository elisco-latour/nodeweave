/**
 * @typedef {{ node: string, port: string }} SelectionSelectors
 */
export class SelectionController {
    /**
     * @param {HTMLElement} workspace
     * @param {import('../core/canvas-state.js').CanvasState} canvasState
     * @param {SelectionSelectors} selectors
     */
    constructor(workspace: HTMLElement, canvasState: import("../core/canvas-state.js").CanvasState, selectors: SelectionSelectors);
    /** @returns {void} */
    attach(): void;
    /** @returns {void} */
    detach(): void;
    #private;
}
export type SelectionSelectors = {
    node: string;
    port: string;
};
