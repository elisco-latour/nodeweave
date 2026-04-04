const VALID_DIRECTIONS = new Set(['in', 'out']);
const VALID_POSITION_HINTS = new Set(['top', 'bottom', 'left', 'right']);

export class Port {
  #id;
  #direction;
  #nodeId;
  #positionHint;

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

  get id() { return this.#id; }
  get direction() { return this.#direction; }
  get nodeId() { return this.#nodeId; }
  get positionHint() { return this.#positionHint; }

  toJSON() {
    return {
      id: this.#id,
      direction: this.#direction,
      nodeId: this.#nodeId,
      positionHint: this.#positionHint,
    };
  }
}

export class Node {
  #id;
  #type;
  #metadata;
  #ports = new Map();

  constructor({ id, type, metadata = {}, x = 0, y = 0 }) {
    this.#id = id;
    this.#type = type;
    this.#metadata = metadata;
    this.x = x;
    this.y = y;
    this.width = 180;
    this.height = 60;
  }

  get id() { return this.#id; }
  get type() { return this.#type; }
  get metadata() { return this.#metadata; }
  get ports() { return this.#ports; }

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
  #id;
  #sourcePortId;
  #targetPortId;

  constructor({ id, sourcePortId, targetPortId }) {
    this.#id = id;
    this.#sourcePortId = sourcePortId;
    this.#targetPortId = targetPortId;
    Object.freeze(this);
  }

  get id() { return this.#id; }
  get sourcePortId() { return this.#sourcePortId; }
  get targetPortId() { return this.#targetPortId; }

  toJSON() {
    return {
      id: this.#id,
      sourcePortId: this.#sourcePortId,
      targetPortId: this.#targetPortId,
    };
  }
}
