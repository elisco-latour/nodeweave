import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CanvasState } from '../../dist/core/canvas-state.js';
import { Node } from '../../dist/core/graph.js';

function makeState() {
  const state = new CanvasState();
  state.addNode(new Node({ id: 'n1', type: 'action', x: 10, y: 20 })); // default 180x60
  return state;
}

describe('CanvasState resize', () => {
  it('resizeNode updates geometry and is undoable', () => {
    const state = makeState();
    state.resizeNode('n1', { x: 10, y: 20, width: 300, height: 120 });

    const node = state.nodes.get('n1');
    assert.equal(node.width, 300);
    assert.equal(node.height, 120);

    state.commandHistory.undo();
    assert.equal(node.width, 180);
    assert.equal(node.height, 60);

    state.commandHistory.redo();
    assert.equal(node.width, 300);
    assert.equal(node.height, 120);
  });

  it('resizeNode can reposition (top/left handles)', () => {
    const state = makeState();
    // shrink from the top-left: origin moves, size shrinks
    state.resizeNode('n1', { x: 40, y: 50, width: 150, height: 30 });
    const node = state.nodes.get('n1');
    assert.deepEqual(
      { x: node.x, y: node.y, width: node.width, height: node.height },
      { x: 40, y: 50, width: 150, height: 30 },
    );
    state.commandHistory.undo();
    assert.deepEqual(
      { x: node.x, y: node.y, width: node.width, height: node.height },
      { x: 10, y: 20, width: 180, height: 60 },
    );
  });

  it('fires node-resized with the new geometry', () => {
    const state = makeState();
    let detail = null;
    state.addEventListener('node-resized', (e) => { detail = e.detail; });
    state.resizeNode('n1', { x: 10, y: 20, width: 200, height: 80 });
    assert.deepEqual(detail, { nodeId: 'n1', x: 10, y: 20, width: 200, height: 80 });
  });

  it('resizeNodeDirect changes geometry without touching history', () => {
    const state = makeState();
    const before = state.commandHistory.canUndo;
    state.resizeNodeDirect('n1', 10, 20, 250, 90);
    const node = state.nodes.get('n1');
    assert.equal(node.width, 250);
    assert.equal(node.height, 90);
    // still only the initial addNode on the undo stack — no resize command pushed
    assert.equal(state.commandHistory.canUndo, before);
  });

  it('resizeNodeDirect on a missing node is a no-op', () => {
    const state = makeState();
    assert.doesNotThrow(() => state.resizeNodeDirect('nope', 0, 0, 10, 10));
  });
});
