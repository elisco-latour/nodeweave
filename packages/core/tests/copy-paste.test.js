import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CanvasState } from '../dist/core/canvas-state.js';
import { Node, Port, Edge } from '../dist/core/graph.js';

function createNodeWithPorts(id, type = 'action', x = 0, y = 0) {
  const node = new Node({ id, type, x, y, metadata: { config: {} } });
  node.addPort(new Port({ id: `${id}:in`, direction: 'in', nodeId: id, positionHint: 'left' }));
  node.addPort(new Port({ id: `${id}:out`, direction: 'out', nodeId: id, positionHint: 'right' }));
  return node;
}

describe('Copy/Paste', () => {
  it('copy single node → paste creates new node at offset', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('n1', 'action', 100, 100));
    state.selectNode('n1');
    state.copySelection();
    state.paste();

    assert.equal(state.nodes.size, 2);
    const nodes = [...state.nodes.values()];
    const pasted = nodes.find(n => n.id !== 'n1');
    assert.ok(pasted);
    assert.equal(pasted.x, 120); // offset by 20
    assert.equal(pasted.y, 120);
  });

  it('copy 2 connected nodes → paste preserves edge between copies', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('n1', 'action', 100, 100));
    state.addNode(createNodeWithPorts('n2', 'action', 300, 100));
    state.addEdge(new Edge({ id: 'e1', sourcePortId: 'n1:out', targetPortId: 'n2:in' }));

    state.selectNodes(['n1', 'n2']);
    state.copySelection();
    state.paste();

    assert.equal(state.nodes.size, 4);
    assert.equal(state.edges.size, 2); // original + pasted edge
  });

  it('pasted IDs are new (not duplicates)', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('n1', 'action', 100, 100));
    state.selectNode('n1');
    state.copySelection();
    state.paste();

    const ids = [...state.nodes.keys()];
    assert.equal(ids.length, 2);
    assert.notEqual(ids[0], ids[1]);
  });

  it('paste with nothing copied → no-op', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('n1', 'action', 100, 100));
    state.paste(); // nothing in clipboard
    assert.equal(state.nodes.size, 1);
  });

  it('undo paste removes pasted items', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('n1', 'action', 100, 100));
    state.addNode(createNodeWithPorts('n2', 'action', 300, 100));
    state.addEdge(new Edge({ id: 'e1', sourcePortId: 'n1:out', targetPortId: 'n2:in' }));

    state.selectNodes(['n1', 'n2']);
    state.copySelection();
    state.paste();

    assert.equal(state.nodes.size, 4);
    assert.equal(state.edges.size, 2);

    state.commandHistory.undo();
    assert.equal(state.nodes.size, 2);
    assert.equal(state.edges.size, 1);
  });

  it('copy from empty selection → no-op', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('n1', 'action', 100, 100));
    state.clearSelection();
    state.copySelection();
    state.paste();
    assert.equal(state.nodes.size, 1);
  });
});
