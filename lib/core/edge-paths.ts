import type { EdgeType } from './graph.js';

export interface Point {
  x: number;
  y: number;
}

export interface EdgePathOptions {
  /** Bezier only: minimum horizontal control-point bow (px). Default 0. */
  minBow?: number;
  /** Bezier only: maximum horizontal control-point bow (px). Default Infinity. */
  maxBow?: number;
  /** Step/smoothstep only: corner radius (px). Default 8. */
  borderRadius?: number;
}

/**
 * Edge path builders.
 *
 * All builders assume a left-to-right flow: the source point sits on the
 * right edge of its node (an `out` port) and the target point sits on the
 * left edge of another node (an `in` port). This matches how ports are
 * positioned across the library and keeps orthogonal routing intuitive.
 *
 * Each builder returns an SVG path `d` string.
 */

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Straight line from source to target. */
export function getStraightPath(source: Point, target: Point): string {
  return `M ${source.x},${source.y} L ${target.x},${target.y}`;
}

/** Geometric midpoint between two points — a reasonable label anchor for any edge type. */
export function getEdgeCenter(source: Point, target: Point): Point {
  return { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
}

/** Cubic Bézier with horizontal control points (the default edge shape). */
export function getBezierPath(source: Point, target: Point, options: EdgePathOptions = {}): string {
  const { minBow = 0, maxBow = Infinity } = options;
  const dx = target.x - source.x;
  const offset = clamp(Math.abs(dx) * 0.5, minBow, maxBow);
  const cp1x = source.x + offset;
  const cp2x = target.x - offset;
  return `M ${source.x},${source.y} C ${cp1x},${source.y} ${cp2x},${target.y} ${target.x},${target.y}`;
}

/** Orthogonal path with sharp corners, routed through the horizontal midpoint. */
export function getStepPath(source: Point, target: Point): string {
  if (Math.abs(target.y - source.y) < 1) {
    return getStraightPath(source, target);
  }
  const midX = (source.x + target.x) / 2;
  return `M ${source.x},${source.y} L ${midX},${source.y} L ${midX},${target.y} L ${target.x},${target.y}`;
}

/** Orthogonal path with rounded corners, routed through the horizontal midpoint. */
export function getSmoothStepPath(source: Point, target: Point, options: EdgePathOptions = {}): string {
  const dy = target.y - source.y;
  if (Math.abs(dy) < 1) {
    return getStraightPath(source, target);
  }

  const { borderRadius = 8 } = options;
  const midX = (source.x + target.x) / 2;
  const dx = target.x - source.x;
  const sX = Math.sign(dx) || 1;
  const sY = Math.sign(dy) || 1;

  // Clamp radius so rounded corners never overshoot a segment.
  const r = Math.min(
    borderRadius,
    Math.abs(midX - source.x),
    Math.abs(target.x - midX),
    Math.abs(dy) / 2,
  );

  return [
    `M ${source.x},${source.y}`,
    `L ${midX - r * sX},${source.y}`,
    `Q ${midX},${source.y} ${midX},${source.y + r * sY}`,
    `L ${midX},${target.y - r * sY}`,
    `Q ${midX},${target.y} ${midX + r * sX},${target.y}`,
    `L ${target.x},${target.y}`,
  ].join(' ');
}

/** Dispatch to the correct builder for the given edge type. */
export function buildEdgePath(
  type: EdgeType,
  source: Point,
  target: Point,
  options: EdgePathOptions = {},
): string {
  switch (type) {
    case 'straight':
      return getStraightPath(source, target);
    case 'step':
      return getStepPath(source, target);
    case 'smoothstep':
      return getSmoothStepPath(source, target, options);
    case 'bezier':
    default:
      return getBezierPath(source, target, options);
  }
}
