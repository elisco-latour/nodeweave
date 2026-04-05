const VALID_DIRECTIONS = new Set(['in', 'out']);
const VALID_POSITION_HINTS = new Set(['top', 'bottom', 'left', 'right']);

/** @typedef {'in' | 'out'} PortDirection */
/** @typedef {'top' | 'bottom' | 'left' | 'right'} PositionHint */

export class Port {
  /** @type {string} */ #id;
  /** @type {PortDirection} */ #direction;
  /** @type {string} */ #nodeId;
  /** @type {PositionHint | null} */ #positionHint;

  /**
   * @param {object} opts
   * @param {string} opts.id
   * @param {PortDirection} opts.direction
   * @param {string} opts.nodeId
   * @param {PositionHint} [opts.positionHint]
   */
  constructor({ id, direction, nodeId, positionHint }) {
    if (!VALID_DIRECTIONS.has(direction)) {
      throw new Error(`Invalid port direction: "${direction}". Must be "in" or "out".`);
    }
    if (positionHint !== undefined && !VALID_POSITION_HINTS.has(positionHint)) {
      throw new Error(`Invalid positionHint: "${positionHint}". Must be "top", "bottom", "left", or "right".`);
    }
    this.#id = id;
    this.#direction = direction;
    this.#nodeId = nodeId;
    this.#positionHint = positionHint ?? null;
    Object.freeze(this);
  }

  /** @returns {string} */ get id() { return this.#id; }
  /** @returns {PortDirection} */ get direction() { return this.#direction; }
  /** @returns {string} */ get nodeId() { return this.#nodeId; }
  /** @returns {PositionHint | null} */ get positionHint() { return this.#positionHint; }

  /** @returns {{ id: string, direction: PortDirection, nodeId: string, positionHint: PositionHint | null }} */
  toJSON() {
    return {
      id: this.#id,
      direction: this.#direction,
      nodeId: this.#nodeId,
      positionHint: this.#positionHint,
    };
  }
}

/**
 * @typedef {Object} NodeMetadata
 * @property {Record<string, any>} [config]
 */

export class Node {
  /** @type {string} */ #id;
  /** @type {string} */ #type;
  /** @type {NodeMetadata} */ #metadata;
  /** @type {Map<string, Port>} */ #ports = new Map();

  /**
   * @param {object} opts
   * @param {string} opts.id
   * @param {string} opts.type
   * @param {NodeMetadata} [opts.metadata]
   * @param {number} [opts.x]
   * @param {number} [opts.y]
   */
  constructor({ id, type, metadata = {}, x = 0, y = 0 }) {
    this.#id = id;
    this.#type = type;
    this.#metadata = metadata;
    this.x = x;
    this.y = y;
    this.width = 180;
    this.height = 60;
  }

  /** @returns {string} */ get id() { return this.#id; }
  /** @returns {string} */ get type() { return this.#type; }
  /** @returns {NodeMetadata} */ get metadata() { return this.#metadata; }
  /** @returns {Map<string, Port>} */ get ports() { return this.#ports; }

  /** @param {Port} port */
  addPort(port) {
    if (port.nodeId !== this.#id) {
      throw new Error(`Port "${port.id}" has nodeId "${port.nodeId}" but expected "${this.#id}".`);
    }
    if (this.#ports.has(port.id)) {
      throw new Error(`Duplicate port ID: "${port.id}" on node "${this.#id}".`);
    }
    this.#ports.set(port.id, port);
  }

  toJSON() {
    return {
      id: this.#id,
      type: this.#type,
      metadata: this.#metadata,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      ports: Array.from(this.#ports.values(), (p) => p.toJSON()),
    };
  }
}

export class Edge {
  /** @type {string} */ #id;
  /** @type {string} */ #sourcePortId;
  /** @type {string} */ #targetPortId;

  /**
   * @param {object} opts
   * @param {string} opts.id
   * @param {string} opts.sourcePortId
   * @param {string} opts.targetPortId
   */
  constructor({ id, sourcePortId, targetPortId }) {
    this.#id = id;
    this.#sourcePortId = sourcePortId;
    this.#targetPortId = targetPortId;
    Object.freeze(this);
  }

  /** @returns {string} */ get id() { return this.#id; }
  /** @returns {string} */ get sourcePortId() { return this.#sourcePortId; }
  /** @returns {string} */ get targetPortId() { return this.#targetPortId; }

  toJSON() {
    return {
      id: this.#id,
      sourcePortId: this.#sourcePortId,
      targetPortId: this.#targetPortId,
    };
  }
}
