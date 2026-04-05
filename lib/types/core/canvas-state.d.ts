/**
 * @typedef {{ panX: number, panY: number, zoom: number }} Viewport
 */
/**
 * @typedef {{ nodes: Array<ReturnType<Node['toJSON']>>, edges: Array<ReturnType<Edge['toJSON']>>, viewport: Viewport }} CanvasStateJSON
 */
/**
 * @typedef {{ nodes: Array<*>, edges: Array<*> }} ClipboardData
 */
/**
 * Central state manager for the pipeline canvas.
 * Extends EventTarget — all mutations go through CommandHistory.
 * Fires: node-added, node-removed, node-moved, edge-added, edge-removed,
 * node-config-updated, viewport-changed, selection-changed, state-reset.
 */
export class CanvasState extends EventTarget {
    /**
     * @param {CanvasStateJSON} json
     * @returns {CanvasState}
     */
    static fromJSON(json: CanvasStateJSON): CanvasState;
    /** @returns {Map<string, Node>} */
    get nodes(): Map<string, Node>;
    /** @returns {Map<string, Edge>} */
    get edges(): Map<string, Edge>;
    /** @returns {Viewport} */
    get viewport(): Viewport;
    /** @returns {Set<string>} */
    get selectedNodeIds(): Set<string>;
    /** @returns {CommandHistory} */
    get commandHistory(): CommandHistory;
    /** @param {Node} node */
    addNode(node: Node): void;
    /** @param {string} nodeId */
    removeNode(nodeId: string): void;
    /**
     * @param {string} nodeId
     * @param {number} x
     * @param {number} y
     */
    setNodePosition(nodeId: string, x: number, y: number): void;
    /** @param {Map<string, {x: number, y: number}>} positionMap */
    setNodePositions(positionMap: Map<string, {
        x: number;
        y: number;
    }>): void;
    /** @param {Edge} edge */
    addEdge(edge: Edge): void;
    /** @param {string} edgeId */
    removeEdge(edgeId: string): void;
    /**
     * @param {string} nodeId
     * @param {Record<string, *>} config
     */
    updateNodeConfig(nodeId: string, config: Record<string, any>): void;
    /**
     * @param {string} nodeId
     * @param {number} x
     * @param {number} y
     */
    moveNodeDirect(nodeId: string, x: number, y: number): void;
    /**
     * @param {number} panX
     * @param {number} panY
     * @param {number} zoom
     */
    setViewport(panX: number, panY: number, zoom: number): void;
    /** @param {string} nodeId */
    selectNode(nodeId: string): void;
    /** @param {string} nodeId */
    toggleNodeSelection(nodeId: string): void;
    /** Deselects all nodes. */
    clearSelection(): void;
    /** @param {string[]} nodeIds */
    selectNodes(nodeIds: string[]): void;
    /**
     * @param {string} portId
     * @returns {Port | null}
     */
    getPort(portId: string): Port | null;
    /**
     * @param {string} portId
     * @returns {Port | null}
     */
    _findPort(portId: string): Port | null;
    /** Copies currently selected nodes (and internal edges) to the clipboard. */
    copySelection(): void;
    /** Pastes clipboard contents as new nodes/edges with offset. Undoable. */
    paste(): void;
    /** Shorthand: copies selection then immediately pastes. */
    duplicate(): void;
    /** @returns {boolean} */
    hasCycle(): boolean;
    /** @returns {CanvasStateJSON} */
    toJSON(): CanvasStateJSON;
    /** Resets all state: nodes, edges, selection, history, viewport. Fires 'state-reset'. */
    clear(): void;
    /** @param {CanvasStateJSON} json */
    loadFromJSON(json: CanvasStateJSON): void;
    #private;
}
export type Viewport = {
    panX: number;
    panY: number;
    zoom: number;
};
export type CanvasStateJSON = {
    nodes: Array<ReturnType<Node["toJSON"]>>;
    edges: Array<ReturnType<Edge["toJSON"]>>;
    viewport: Viewport;
};
export type ClipboardData = {
    nodes: Array<any>;
    edges: Array<any>;
};
import { Node } from "./graph.js";
import { Edge } from "./graph.js";
import { CommandHistory } from "./command-history.js";
import { Port } from "./graph.js";
