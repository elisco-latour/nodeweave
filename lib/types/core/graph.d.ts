/** @typedef {'in' | 'out'} PortDirection */
/** @typedef {'top' | 'bottom' | 'left' | 'right'} PositionHint */
export class Port {
    /**
     * @param {object} opts
     * @param {string} opts.id
     * @param {PortDirection} opts.direction
     * @param {string} opts.nodeId
     * @param {PositionHint} [opts.positionHint]
     */
    constructor({ id, direction, nodeId, positionHint }: {
        id: string;
        direction: PortDirection;
        nodeId: string;
        positionHint?: PositionHint;
    });
    /** @returns {string} */ get id(): string;
    /** @returns {PortDirection} */ get direction(): PortDirection;
    /** @returns {string} */ get nodeId(): string;
    /** @returns {PositionHint | null} */ get positionHint(): PositionHint | null;
    /** @returns {{ id: string, direction: PortDirection, nodeId: string, positionHint: PositionHint | null }} */
    toJSON(): {
        id: string;
        direction: PortDirection;
        nodeId: string;
        positionHint: PositionHint | null;
    };
    #private;
}
/**
 * @typedef {Object} NodeMetadata
 * @property {Record<string, any>} [config]
 */
export class Node {
    /**
     * @param {object} opts
     * @param {string} opts.id
     * @param {string} opts.type
     * @param {NodeMetadata} [opts.metadata]
     * @param {number} [opts.x]
     * @param {number} [opts.y]
     */
    constructor({ id, type, metadata, x, y }: {
        id: string;
        type: string;
        metadata?: NodeMetadata;
        x?: number;
        y?: number;
    });
    x: number;
    y: number;
    width: number;
    height: number;
    /** @returns {string} */ get id(): string;
    /** @returns {string} */ get type(): string;
    /** @returns {NodeMetadata} */ get metadata(): NodeMetadata;
    /** @returns {Map<string, Port>} */ get ports(): Map<string, Port>;
    /** @param {Port} port */
    addPort(port: Port): void;
    toJSON(): {
        id: string;
        type: string;
        metadata: NodeMetadata;
        x: number;
        y: number;
        width: number;
        height: number;
        ports: {
            id: string;
            direction: PortDirection;
            nodeId: string;
            positionHint: PositionHint | null;
        }[];
    };
    #private;
}
export class Edge {
    /**
     * @param {object} opts
     * @param {string} opts.id
     * @param {string} opts.sourcePortId
     * @param {string} opts.targetPortId
     */
    constructor({ id, sourcePortId, targetPortId }: {
        id: string;
        sourcePortId: string;
        targetPortId: string;
    });
    /** @returns {string} */ get id(): string;
    /** @returns {string} */ get sourcePortId(): string;
    /** @returns {string} */ get targetPortId(): string;
    toJSON(): {
        id: string;
        sourcePortId: string;
        targetPortId: string;
    };
    #private;
}
export type PortDirection = "in" | "out";
export type PositionHint = "top" | "bottom" | "left" | "right";
export type NodeMetadata = {
    config?: Record<string, any>;
};
