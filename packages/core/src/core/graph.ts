import type { PortDirection, PositionHint, NodeMetadata } from '../types.js';

export type { PortDirection, PositionHint, NodeMetadata };

const VALID_DIRECTIONS = new Set<PortDirection>(['in', 'out']);
const VALID_POSITION_HINTS = new Set<PositionHint>(['top', 'bottom', 'left', 'right']);

export interface PortJSON {
  id: string;
  direction: PortDirection;
  nodeId: string;
  positionHint: PositionHint | null;
}

export class Port {
  readonly #id: string;
  readonly #direction: PortDirection;
  readonly #nodeId: string;
  readonly #positionHint: PositionHint | null;

  constructor({ id, direction, nodeId, positionHint }: {
    id: string;
    direction: PortDirection;
    nodeId: string;
    positionHint?: PositionHint;
  }) {
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

  get id(): string { return this.#id; }
  get direction(): PortDirection { return this.#direction; }
  get nodeId(): string { return this.#nodeId; }
  get positionHint(): PositionHint | null { return this.#positionHint; }

  toJSON(): PortJSON {
    return {
      id: this.#id,
      direction: this.#direction,
      nodeId: this.#nodeId,
      positionHint: this.#positionHint,
    };
  }
}

export interface NodeJSON {
  id: string;
  type: string;
  metadata: NodeMetadata;
  x: number;
  y: number;
  width: number;
  height: number;
  ports: PortJSON[];
}

export class Node {
  readonly #id: string;
  readonly #type: string;
  readonly #metadata: NodeMetadata;
  readonly #ports: Map<string, Port> = new Map();

  x: number;
  y: number;
  width: number;
  height: number;

  constructor({ id, type, metadata = {}, x = 0, y = 0 }: {
    id: string;
    type: string;
    metadata?: NodeMetadata;
    x?: number;
    y?: number;
  }) {
    this.#id = id;
    this.#type = type;
    this.#metadata = metadata;
    this.x = x;
    this.y = y;
    this.width = 180;
    this.height = 60;
  }

  get id(): string { return this.#id; }
  get type(): string { return this.#type; }
  get metadata(): NodeMetadata { return this.#metadata; }
  get ports(): Map<string, Port> { return this.#ports; }

  addPort(port: Port): void {
    if (port.nodeId !== this.#id) {
      throw new Error(`Port "${port.id}" has nodeId "${port.nodeId}" but expected "${this.#id}".`);
    }
    if (this.#ports.has(port.id)) {
      throw new Error(`Duplicate port ID: "${port.id}" on node "${this.#id}".`);
    }
    this.#ports.set(port.id, port);
  }

  toJSON(): NodeJSON {
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

export type EdgeType = 'bezier' | 'straight' | 'step' | 'smoothstep';
export type MarkerType = 'arrow' | 'arrowclosed' | null;

export interface EdgeJSON {
  id: string;
  sourcePortId: string;
  targetPortId: string;
  type: EdgeType;
  label?: string;
  animated: boolean;
  markerEnd: MarkerType;
  /** Free-form, renderer-agnostic bag (e.g. a CSS class, weight, colour). */
  data?: Record<string, unknown>;
}

export class Edge {
  readonly #id: string;
  readonly #sourcePortId: string;
  readonly #targetPortId: string;
  readonly #type: EdgeType;
  readonly #label: string | undefined;
  readonly #animated: boolean;
  readonly #markerEnd: MarkerType;
  readonly #data: Record<string, unknown> | undefined;

  constructor({ id, sourcePortId, targetPortId, type = 'bezier', label, animated = false, markerEnd = null, data }: {
    id: string;
    sourcePortId: string;
    targetPortId: string;
    type?: EdgeType;
    label?: string;
    animated?: boolean;
    markerEnd?: MarkerType;
    data?: Record<string, unknown>;
  }) {
    this.#id = id;
    this.#sourcePortId = sourcePortId;
    this.#targetPortId = targetPortId;
    this.#type = type;
    this.#label = label;
    this.#animated = animated;
    this.#markerEnd = markerEnd;
    this.#data = data;
    Object.freeze(this);
  }

  get id(): string { return this.#id; }
  get sourcePortId(): string { return this.#sourcePortId; }
  get targetPortId(): string { return this.#targetPortId; }
  get type(): EdgeType { return this.#type; }
  get label(): string | undefined { return this.#label; }
  get animated(): boolean { return this.#animated; }
  get markerEnd(): MarkerType { return this.#markerEnd; }
  /** Free-form, renderer-agnostic bag carried through JSON round-trips. */
  get data(): Record<string, unknown> | undefined { return this.#data; }

  toJSON(): EdgeJSON {
    return {
      id: this.#id,
      sourcePortId: this.#sourcePortId,
      targetPortId: this.#targetPortId,
      type: this.#type,
      label: this.#label,
      animated: this.#animated,
      markerEnd: this.#markerEnd,
      ...(this.#data !== undefined ? { data: this.#data } : {}),
    };
  }
}
