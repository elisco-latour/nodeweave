import type { Viewport } from '../types.js';

export interface Point {
  x: number;
  y: number;
}

/** Minimal shape of a DOMRect — only the offset we need. */
export interface Offset {
  left: number;
  top: number;
}

const ORIGIN: Offset = { left: 0, top: 0 };

/**
 * Convert a screen/client point (e.g. `event.clientX/Y`) into flow (canvas)
 * coordinates, undoing the viewport pan/zoom.
 *
 * Pass the bounding rect of the canvas surface as `offset` so the point is
 * measured relative to the canvas rather than the page. This is the primitive
 * every "drop from a palette onto the canvas" interaction needs.
 */
export function screenToFlowPosition(
  point: Point,
  viewport: Viewport,
  offset: Offset = ORIGIN,
): Point {
  return {
    x: (point.x - offset.left - viewport.panX) / viewport.zoom,
    y: (point.y - offset.top - viewport.panY) / viewport.zoom,
  };
}

/**
 * Inverse of {@link screenToFlowPosition}: convert a flow (canvas) point into
 * screen coordinates relative to `offset`. Useful for anchoring overlays (a
 * contextual inspector, a tooltip) to a node's on-screen position.
 */
export function flowToScreenPosition(
  point: Point,
  viewport: Viewport,
  offset: Offset = ORIGIN,
): Point {
  return {
    x: point.x * viewport.zoom + viewport.panX + offset.left,
    y: point.y * viewport.zoom + viewport.panY + offset.top,
  };
}
