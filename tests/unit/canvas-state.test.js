import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CanvasState } from '../../dist/core/canvas-state.js';
import { Node, Port, Edge } from '../../dist/core/graph.js';
import { PipelineBuilder } from '../../dist/core/pipeline-builder.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createNodeWithPorts(id, type = 'action') {
  const node = new Node({ id, type });
  node.addPort(new Port({ id: `${id}:in`, direction: 'in', nodeId: id, positionHint: 'left' }));
  node.addPort(new Port({ id: `${id}:out`, direction: 'out', nodeId: id, positionHint: 'right' }));
  return node;
}

function collectEvents(state, eventName) {
  const events = [];
  state.addEventListener(eventName, (e) => events.push(e.detail));
  return events;
}

// ─── CanvasState basics ──────────────────────────────────────────────────────

describe('CanvasState — basics', () => {
  it('initializes with empty collections and default viewport', () => {
    const state = new CanvasState();
    assert.equal(state.nodes.size, 0);
    assert.equal(state.edges.size, 0);
    assert.deepEqual(state.viewport, { panX: 0, panY: 0, zoom: 1 });
    assert.equal(state.selectedNodeIds.size, 0);
  });

  it('inherits EventTarget (addEventListener/dispatchEvent)', () => {
    const state = new CanvasState();
    let fired = false;
    state.addEventListener('test', () => { fired = true; });
    state.dispatchEvent(new Event('test'));
    assert.equal(fired, true);
  });

  it('exposes commandHistory with canUndo/canRedo', () => {
    const state = new CanvasState();
    assert.equal(state.commandHistory.canUndo, false);
    assert.equal(state.commandHistory.canRedo, false);
  });
});

// ─── AddNode / RemoveNode ────────────────────────────────────────────────────

describe('CanvasState — AddNode', () => {
  it('adds a node and it exists in the map', () => {
    const state = new CanvasState();
    const node = createNodeWithPorts('n1');
    state.addNode(node);
    assert.equal(state.nodes.size, 1);
    assert.equal(state.nodes.get('n1'), node);
  });

  it('fires node-added event', () => {
    const state = new CanvasState();
    const events = collectEvents(state, 'node-added');
    state.addNode(createNodeWithPorts('n1'));
    assert.equal(events.length, 1);
    assert.equal(events[0].nodeId, 'n1');
  });

  it('undo removes the node and fires node-removed', () => {
    const state = new CanvasState();
    const removedEvents = collectEvents(state, 'node-removed');
    state.addNode(createNodeWithPorts('n1'));
    assert.equal(state.nodes.size, 1);
    state.commandHistory.undo();
    assert.equal(state.nodes.size, 0);
    assert.equal(removedEvents.length, 1);
    assert.equal(removedEvents[0].nodeId, 'n1');
  });

  it('redo re-adds the node', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('n1'));
    state.commandHistory.undo();
    state.commandHistory.redo();
    assert.equal(state.nodes.size, 1);
  });
});

describe('CanvasState — RemoveNode', () => {
  it('removes a node', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('n1'));
    state.removeNode('n1');
    assert.equal(state.nodes.size, 0);
  });

  it('removing a node also removes connected edges', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('a'));
    state.addNode(createNodeWithPorts('b'));
    state.addEdge(new Edge({ id: 'e1', sourcePortId: 'a:out', targetPortId: 'b:in' }));
    assert.equal(state.edges.size, 1);
    state.removeNode('a');
    assert.equal(state.edges.size, 0);
  });

  it('undo restores node and its edges', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('a'));
    state.addNode(createNodeWithPorts('b'));
    state.addEdge(new Edge({ id: 'e1', sourcePortId: 'a:out', targetPortId: 'b:in' }));
    state.removeNode('a');
    state.commandHistory.undo();
    assert.equal(state.nodes.size, 2);
    assert.equal(state.edges.size, 1);
  });

  it('throws when node does not exist', () => {
    const state = new CanvasState();
    assert.throws(() => state.removeNode('nope'), /not found/);
  });
});

// ─── MoveNode ────────────────────────────────────────────────────────────────

describe('CanvasState — MoveNode', () => {
  it('updates node coordinates and fires node-moved', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('n1'));
    const events = collectEvents(state, 'node-moved');
    state.setNodePosition('n1', 100, 200);
    assert.equal(state.nodes.get('n1').x, 100);
    assert.equal(state.nodes.get('n1').y, 200);
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], { nodeId: 'n1', x: 100, y: 200 });
  });

  it('undo restores old coordinates and fires node-moved', () => {
    const state = new CanvasState();
    const node = createNodeWithPorts('n1');
    node.x = 10;
    node.y = 20;
    state.addNode(node);
    state.setNodePosition('n1', 100, 200);
    const events = collectEvents(state, 'node-moved');
    state.commandHistory.undo();
    assert.equal(state.nodes.get('n1').x, 10);
    assert.equal(state.nodes.get('n1').y, 20);
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], { nodeId: 'n1', x: 10, y: 20 });
  });

  it('throws when node does not exist', () => {
    const state = new CanvasState();
    assert.throws(() => state.setNodePosition('nope', 0, 0), /not found/);
  });
});

// ─── AddEdge ─────────────────────────────────────────────────────────────────

describe('CanvasState — AddEdge', () => {
  it('adds an edge between valid ports', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('a'));
    state.addNode(createNodeWithPorts('b'));
    const events = collectEvents(state, 'edge-added');
    state.addEdge(new Edge({ id: 'e1', sourcePortId: 'a:out', targetPortId: 'b:in' }));
    assert.equal(state.edges.size, 1);
    assert.equal(events.length, 1);
  });

  it('throws when source port does not exist', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('a'));
    assert.throws(
      () => state.addEdge(new Edge({ id: 'e1', sourcePortId: 'nope:out', targetPortId: 'a:in' })),
      /not found/,
    );
  });

  it('throws when target port does not exist', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('a'));
    assert.throws(
      () => state.addEdge(new Edge({ id: 'e1', sourcePortId: 'a:out', targetPortId: 'nope:in' })),
      /not found/,
    );
  });

  it('throws when source port direction is not "out"', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('a'));
    state.addNode(createNodeWithPorts('b'));
    assert.throws(
      () => state.addEdge(new Edge({ id: 'e1', sourcePortId: 'a:in', targetPortId: 'b:in' })),
      /direction "out"/,
    );
  });

  it('throws when target port direction is not "in"', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('a'));
    state.addNode(createNodeWithPorts('b'));
    assert.throws(
      () => state.addEdge(new Edge({ id: 'e1', sourcePortId: 'a:out', targetPortId: 'b:out' })),
      /direction "in"/,
    );
  });

  it('throws on self-loop', () => {
    const state = new CanvasState();
    const node = new Node({ id: 'a', type: 'action' });
    node.addPort(new Port({ id: 'a:in', direction: 'in', nodeId: 'a' }));
    node.addPort(new Port({ id: 'a:out', direction: 'out', nodeId: 'a' }));
    state.addNode(node);
    assert.throws(
      () => state.addEdge(new Edge({ id: 'e1', sourcePortId: 'a:out', targetPortId: 'a:in' })),
      /Self-loops/,
    );
  });

  it('undo removes the edge', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('a'));
    state.addNode(createNodeWithPorts('b'));
    state.addEdge(new Edge({ id: 'e1', sourcePortId: 'a:out', targetPortId: 'b:in' }));
    state.commandHistory.undo();
    assert.equal(state.edges.size, 0);
  });
});

// ─── Cycle detection ─────────────────────────────────────────────────────────

describe('CanvasState — Cycle detection', () => {
  it('throws when adding an edge that creates a cycle', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('a'));
    state.addNode(createNodeWithPorts('b'));
    state.addNode(createNodeWithPorts('c'));
    state.addEdge(new Edge({ id: 'e1', sourcePortId: 'a:out', targetPortId: 'b:in' }));
    state.addEdge(new Edge({ id: 'e2', sourcePortId: 'b:out', targetPortId: 'c:in' }));
    assert.throws(
      () => state.addEdge(new Edge({ id: 'e3', sourcePortId: 'c:out', targetPortId: 'a:in' })),
      /cycle/,
    );
    // Edge should not remain in the graph
    assert.equal(state.edges.size, 2);
  });

  it('allows linear chains', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('a'));
    state.addNode(createNodeWithPorts('b'));
    state.addNode(createNodeWithPorts('c'));
    state.addEdge(new Edge({ id: 'e1', sourcePortId: 'a:out', targetPortId: 'b:in' }));
    state.addEdge(new Edge({ id: 'e2', sourcePortId: 'b:out', targetPortId: 'c:in' }));
    assert.equal(state.edges.size, 2);
  });

  it('allows fan-out and fan-in graphs', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('a'));
    state.addNode(createNodeWithPorts('b'));
    state.addNode(createNodeWithPorts('c'));
    state.addNode(createNodeWithPorts('d'));
    // fan-out: a → b, a → c
    state.addEdge(new Edge({ id: 'e1', sourcePortId: 'a:out', targetPortId: 'b:in' }));
    state.addEdge(new Edge({ id: 'e2', sourcePortId: 'a:out', targetPortId: 'c:in' }));
    // fan-in: b → d, c → d
    state.addEdge(new Edge({ id: 'e3', sourcePortId: 'b:out', targetPortId: 'd:in' }));
    state.addEdge(new Edge({ id: 'e4', sourcePortId: 'c:out', targetPortId: 'd:in' }));
    assert.equal(state.edges.size, 4);
  });
});

// ─── RemoveEdge ──────────────────────────────────────────────────────────────

describe('CanvasState — RemoveEdge', () => {
  it('removes an edge', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('a'));
    state.addNode(createNodeWithPorts('b'));
    state.addEdge(new Edge({ id: 'e1', sourcePortId: 'a:out', targetPortId: 'b:in' }));
    state.removeEdge('e1');
    assert.equal(state.edges.size, 0);
  });

  it('throws when edge does not exist', () => {
    const state = new CanvasState();
    assert.throws(() => state.removeEdge('nope'), /not found/);
  });

  it('undo restores the edge', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('a'));
    state.addNode(createNodeWithPorts('b'));
    state.addEdge(new Edge({ id: 'e1', sourcePortId: 'a:out', targetPortId: 'b:in' }));
    state.removeEdge('e1');
    state.commandHistory.undo();
    assert.equal(state.edges.size, 1);
  });
});

// ─── Viewport ────────────────────────────────────────────────────────────────

describe('CanvasState — Viewport', () => {
  it('updates viewport and fires event', () => {
    const state = new CanvasState();
    const events = collectEvents(state, 'viewport-changed');
    state.setViewport(10, 20, 1.5);
    assert.deepEqual(state.viewport, { panX: 10, panY: 20, zoom: 1.5 });
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], { panX: 10, panY: 20, zoom: 1.5 });
  });

  it('is NOT undoable', () => {
    const state = new CanvasState();
    state.setViewport(10, 20, 2);
    assert.equal(state.commandHistory.canUndo, false);
  });
});

// ─── Selection ───────────────────────────────────────────────────────────────

describe('CanvasState — Selection', () => {
  it('selectNode clears previous and sets single node', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('a'));
    state.addNode(createNodeWithPorts('b'));
    state.selectNode('a');
    state.selectNode('b');
    assert.equal(state.selectedNodeIds.size, 1);
    assert.ok(state.selectedNodeIds.has('b'));
  });

  it('toggleNodeSelection toggles', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('a'));
    state.toggleNodeSelection('a');
    assert.ok(state.selectedNodeIds.has('a'));
    state.toggleNodeSelection('a');
    assert.equal(state.selectedNodeIds.size, 0);
  });

  it('clearSelection empties the set', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('a'));
    state.selectNode('a');
    state.clearSelection();
    assert.equal(state.selectedNodeIds.size, 0);
  });

  it('selectNodes replaces selection', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('a'));
    state.addNode(createNodeWithPorts('b'));
    state.addNode(createNodeWithPorts('c'));
    state.selectNodes(['a', 'c']);
    assert.equal(state.selectedNodeIds.size, 2);
    assert.ok(state.selectedNodeIds.has('a'));
    assert.ok(state.selectedNodeIds.has('c'));
  });

  it('fires selection-changed event', () => {
    const state = new CanvasState();
    const events = collectEvents(state, 'selection-changed');
    state.addNode(createNodeWithPorts('a'));
    state.selectNode('a');
    assert.equal(events.length, 1);
    assert.ok(events[0].selectedIds.has('a'));
  });

  it('is NOT undoable', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('a'));
    const undoBefore = state.commandHistory.canUndo;
    state.selectNode('a');
    // canUndo should only reflect the addNode, not the selectNode
    // addNode added one command; selectNode did NOT add one
    state.commandHistory.undo(); // undoes addNode
    assert.equal(state.commandHistory.canUndo, false);
  });
});

// ─── toJSON / fromJSON ───────────────────────────────────────────────────────

describe('CanvasState — Serialization', () => {
  it('round-trips correctly', () => {
    const state = new CanvasState();
    const nodeA = createNodeWithPorts('a');
    nodeA.x = 100;
    nodeA.y = 200;
    state.addNode(nodeA);
    state.addNode(createNodeWithPorts('b'));
    state.addEdge(new Edge({ id: 'e1', sourcePortId: 'a:out', targetPortId: 'b:in' }));
    state.setViewport(5, 10, 2);

    const json = state.toJSON();
    const restored = CanvasState.fromJSON(json);

    assert.equal(restored.nodes.size, 2);
    assert.equal(restored.edges.size, 1);
    assert.equal(restored.nodes.get('a').x, 100);
    assert.equal(restored.nodes.get('a').y, 200);
    assert.equal(restored.nodes.get('a').ports.size, 2);
    assert.deepEqual(restored.viewport, { panX: 5, panY: 10, zoom: 2 });
  });

  it('fromJSON does not populate undo stack', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('a'));
    const json = state.toJSON();
    const restored = CanvasState.fromJSON(json);
    assert.equal(restored.commandHistory.canUndo, false);
  });

  it('double round-trip produces identical JSON', () => {
    const state = new CanvasState();
    state.addNode(createNodeWithPorts('a'));
    state.addNode(createNodeWithPorts('b'));
    state.addEdge(new Edge({ id: 'e1', sourcePortId: 'a:out', targetPortId: 'b:in' }));
    state.setViewport(1, 2, 3);

    const json1 = state.toJSON();
    const json2 = CanvasState.fromJSON(json1).toJSON();
    assert.deepEqual(json1, json2);
  });
});

// ─── PipelineBuilder ─────────────────────────────────────────────────────────

describe('PipelineBuilder', () => {
  it('fluent chain produces a valid CanvasState', () => {
    const state = new PipelineBuilder()
      .addJob('build', 'Build', 0)
      .addJob('test', 'Test', 1)
        .dependsOn('build')
      .addJob('deploy', 'Deploy', 2)
        .dependsOn('test')
      .addJob('notify', 'Notify', 2)
        .dependsOn('test')
      .build();

    assert.equal(state.nodes.size, 4);
    assert.equal(state.edges.size, 3);
  });

  it('assigns x positions based on stage columns', () => {
    const state = new PipelineBuilder()
      .addJob('a', 'A', 0)
      .addJob('b', 'B', 1)
        .dependsOn('a')
      .build();

    assert.ok(state.nodes.get('b').x > state.nodes.get('a').x);
  });

  it('throws for nonexistent parent dependency', () => {
    assert.throws(() => {
      new PipelineBuilder()
        .addJob('a', 'A', 0)
          .dependsOn('nope')
        .build();
    }, /unknown job/);
  });

  it('throws for circular dependency', () => {
    assert.throws(() => {
      new PipelineBuilder()
        .addJob('a', 'A', 0)
          .dependsOn('b')
        .addJob('b', 'B', 0)
          .dependsOn('a')
        .build();
    }, /cycle/);
  });
});
