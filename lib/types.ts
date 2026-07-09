// Shared public types for visual-canvas

export type PortDirection = 'in' | 'out';
export type PositionHint = 'top' | 'bottom' | 'left' | 'right';

export interface Viewport {
  panX: number;
  panY: number;
  zoom: number;
}

export interface NodeMetadata {
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

export type RuleOperator = 'equals' | 'notEquals' | 'in' | 'notIn' | 'exists' | 'notExists';

export interface FieldRule {
  field: string;
  operator: RuleOperator;
  value?: unknown;
}
export interface AndRule { $and: Rule[]; }
export interface OrRule { $or: Rule[]; }
export type Rule = FieldRule | AndRule | OrRule;

export type SchemaFieldType = 'string' | 'number' | 'select' | 'textarea' | 'boolean' | 'list';

export interface SchemaField {
  type: SchemaFieldType;
  label: string;
  default?: unknown;
  options?: string[];
  showIf?: Rule;
  itemSchema?: Record<string, SchemaField>;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
}

export interface VisualDefinition {
  color: string;
  label: string;
  icon?: string;
}

export interface PortDefinition {
  id: string;
  label?: string;
  position?: PositionHint;
  dataType?: string;
}

export interface TopologyDefinition {
  inputs: PortDefinition[];
  outputs: PortDefinition[];
}

export interface SchemaDefinition {
  fields: Record<string, SchemaField>;
}

/** Options accepted by CanvasState constructor. */
export interface CanvasStateOptions {
  /**
   * Called after an edge is successfully added.
   * Return value is ignored; throw to prevent (use isValidConnection instead).
   */
  onConnect?: (sourcePortId: string, targetPortId: string) => void;
  /**
   * Called before adding an edge. Return false to reject the connection.
   * Checked after built-in validations (direction, self-loop) but before cycle detection.
   */
  isValidConnection?: (sourcePortId: string, targetPortId: string) => boolean;
  /** Called whenever the nodes map changes (add/remove/move/paste). */
  onNodesChange?: () => void;
  /** Called whenever the edges map changes (add/remove/paste). */
  onEdgesChange?: () => void;
}

/** Options accepted by all controller constructors. */
export interface ControllerOptions {
  /** CSS selector (or custom element tag) that matches node host elements. */
  nodeSelector: string;
  /** CSS selector (or attribute selector) that matches port elements. */
  portSelector: string;
  /** If set, snaps to a grid of [width, height] pixels on drag commit. */
  snapGrid?: [number, number];
  /** Called after an edge connection is made via the EdgeRoutingController. */
  onConnect?: (sourcePortId: string, targetPortId: string) => void;
  /**
   * Called before connecting. Return false to reject.
   * Applied in EdgeRoutingController before attempting state.addEdge().
   */
  isValidConnection?: (sourcePortId: string, targetPortId: string) => boolean;
  /** Called every animation frame while a node is being dragged. */
  onNodeDrag?: (nodeId: string, x: number, y: number) => void;
  /** Called once when a node drag is committed (pointer up). */
  onNodeDragStop?: (nodeId: string, x: number, y: number) => void;
}
