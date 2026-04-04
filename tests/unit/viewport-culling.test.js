import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ViewportCulling } from '../../lib/core/viewport-culling.js';
import { CanvasState } from '../../lib/core/canvas-state.js';
import { Node, Port } from '../../lib/core/graph.js';

function createNode(id, x, y, width = 180, height = 60) {
  const node = new Node({ id, type: 'action', x, y });
  node.width = width;
  node.height = height;
  node.addPort(new Port({ id: `${id}:in`, direction: 'in', nodeId: id }));
  node.addPort(new Port({ id: `${id}:out`, direction: 'out', nodeId: id }));
  return node;
}

describe('ViewportCulling', () => {
  it('node fully inside viewport — included', () => {
    const state = new CanvasState();
    state.addNode(createNode('n1', 100, 100, 180, 60));
    const visible = ViewportCulling.getVisibleNodes(state, { x: 0, y: 0, width: 500, height: 500 });
    assert.deepEqual(visible, ['n1']);
  });

  it('node fully outside — left — excluded', () => {
    const state = new CanvasState();
    state.addNode(createNode('n1', -300, 100, 180, 60));
    const visible = ViewportCulling.getVisibleNodes(state, { x: 0, y: 0, width: 500, height: 500 });
    assert.deepEqual(visible, []);
  });

  it('node fully outside — right — excluded', () => {
    const state = new CanvasState();
    state.addNode(createNode('n1', 600, 100, 180, 60));
    const visible = ViewportCulling.getVisibleNodes(state, { x: 0, y: 0, width: 500, height: 500 });
    assert.deepEqual(visible, []);
  });

  it('node fully outside — above — excluded', () => {
    const state = new CanvasState();
    state.addNode(createNode('n1', 100, -200, 180, 60));
    const visible = ViewportCulling.getVisibleNodes(state, { x: 0, y: 0, width: 500, height: 500 });
    assert.deepEqual(visible, []);
  });

  it('node fully outside — below — excluded', () => {
    const state = new CanvasState();
    state.addNode(createNode('n1', 100, 600, 180, 60));
    const visible = ViewportCulling.getVisibleNodes(state, { x: 0, y: 0, width: 500, height: 500 });
    assert.deepEqual(visible, []);
  });

  it('node partially overlapping left edge — included', () => {
    const state = new CanvasState();
    state.addNode(createNode('n1', -100, 100, 180, 60));
    const visible = ViewportCulling.getVisibleNodes(state, { x: 0, y: 0, width: 500, height: 500 });
    assert.deepEqual(visible, ['n1']);
  });

  it('node partially overlapping right edge — included', () => {
    const state = new CanvasState();
    state.addNode(createNode('n1', 400, 100, 180, 60));
    const visible = ViewportCulling.getVisibleNodes(state, { x: 0, y: 0, width: 500, height: 500 });
    assert.deepEqual(visible, ['n1']);
  });

  it('node partially overlapping top edge — included', () => {
    const state = new CanvasState();
    state.addNode(createNode('n1', 100, -30, 180, 60));
    const visible = ViewportCulling.getVisibleNodes(state, { x: 0, y: 0, width: 500, height: 500 });
    assert.deepEqual(visible, ['n1']);
  });

  it('node partially overlapping bottom edge — included', () => {
    const state = new CanvasState();
    state.addNode(createNode('n1', 100, 470, 180, 60));
    const visible = ViewportCulling.getVisibleNodes(state, { x: 0, y: 0, width: 500, height: 500 });
    assert.deepEqual(visible, ['n1']);
  });

  it('node larger than viewport (covers it) — included', () => {
    const state = new CanvasState();
    state.addNode(createNode('n1', -100, -100, 1000, 1000));
    const visible = ViewportCulling.getVisibleNodes(state, { x: 0, y: 0, width: 500, height: 500 });
    assert.deepEqual(visible, ['n1']);
  });

  it('zero nodes — empty result', () => {
    const state = new CanvasState();
    const visible = ViewportCulling.getVisibleNodes(state, { x: 0, y: 0, width: 500, height: 500 });
    assert.deepEqual(visible, []);
  });

  it('all nodes visible — all returned', () => {
    const state = new CanvasState();
    state.addNode(createNode('n1', 10, 10, 100, 50));
    state.addNode(createNode('n2', 200, 200, 100, 50));
    state.addNode(createNode('n3', 350, 100, 100, 50));
    const visible = ViewportCulling.getVisibleNodes(state, { x: 0, y: 0, width: 500, height: 500 });
    assert.equal(visible.length, 3);
    assert.ok(visible.includes('n1'));
    assert.ok(visible.includes('n2'));
    assert.ok(visible.includes('n3'));
  });
});
