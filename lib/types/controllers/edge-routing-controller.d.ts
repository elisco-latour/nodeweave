/**
 * @typedef {{ node: string, port: string }} EdgeRoutingSelectors
 */
export class EdgeRoutingController {
    /**
     * @param {HTMLElement} workspace
     * @param {import('../core/canvas-state.js').CanvasState} canvasState
     * @param {HTMLElement} edgeLayer
     * @param {EdgeRoutingSelectors} selectors
     */
    constructor(workspace: HTMLElement, canvasState: import("../core/canvas-state.js").CanvasState, edgeLayer: HTMLElement, selectors: EdgeRoutingSelectors);
    /** @returns {boolean} */
    get isRouting(): boolean;
    /** @returns {void} */
    attach(): void;
    /** @returns {void} */
    detach(): void;
    #private;
}
export type EdgeRoutingSelectors = {
    node: string;
    port: string;
};
