/**
 * @typedef {{ node: string }} KeyboardSelectors
 */
export class KeyboardController {
    /**
     * @param {HTMLElement} workspace
     * @param {import('../core/canvas-state.js').CanvasState} canvasState
     * @param {KeyboardSelectors} selectors
     */
    constructor(workspace: HTMLElement, canvasState: import("../core/canvas-state.js").CanvasState, selectors: KeyboardSelectors);
    /** @returns {void} */
    attach(): void;
    /** @returns {void} */
    detach(): void;
    #private;
}
export type KeyboardSelectors = {
    node: string;
};
