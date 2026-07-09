import { CanvasState, Node, Port } from 'visual-canvas/core';

export interface Point {
  x: number;
  y: number;
}

/**
 * Local position of a port within its node box. Ports of the same direction
 * are evenly distributed down the node's height, on the left ('in') or right
 * ('out') edge. The Angular node host and the edge layer share this so edges
 * always meet the rendered port dots.
 */
export function portLocal(node: Node, index: number, count: number, direction: 'in' | 'out'): Point {
  return {
    x: direction === 'out' ? node.width : 0,
    y: (node.height * (index + 1)) / (count + 1),
  };
}

/** Absolute (canvas-space) position of a port, or null if it can't be found. */
export function portCanvas(state: CanvasState, portId: string): Point | null {
  const port = state.getPort(portId);
  if (!port) return null;
  const node = state.nodes.get(port.nodeId);
  if (!node) return null;
  const sameDir = [...node.ports.values()].filter((p: Port) => p.direction === port.direction);
  const index = sameDir.indexOf(port);
  const local = portLocal(node, index, sameDir.length, port.direction);
  return { x: node.x + local.x, y: node.y + local.y };
}

export interface PortView {
  port: Port;
  x: number;
  y: number;
}

/** Port descriptors (with local positions) for rendering a node's handles. */
export function portViews(node: Node): PortView[] {
  const views: PortView[] = [];
  const ins = [...node.ports.values()].filter((p) => p.direction === 'in');
  const outs = [...node.ports.values()].filter((p) => p.direction === 'out');
  ins.forEach((port, i) => {
    const l = portLocal(node, i, ins.length, 'in');
    views.push({ port, x: l.x, y: l.y });
  });
  outs.forEach((port, i) => {
    const l = portLocal(node, i, outs.length, 'out');
    views.push({ port, x: l.x, y: l.y });
  });
  return views;
}
