import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Port, Node, Edge } from '../../dist/core/graph.js';

describe('Port', () => {
  it('constructs with valid direction "in"', () => {
    const p = new Port({ id: 'p1', direction: 'in', nodeId: 'n1', positionHint: 'left' });
    assert.equal(p.id, 'p1');
    assert.equal(p.direction, 'in');
    assert.equal(p.nodeId, 'n1');
    assert.equal(p.positionHint, 'left');
  });

  it('constructs with valid direction "out"', () => {
    const p = new Port({ id: 'p2', direction: 'out', nodeId: 'n1', positionHint: 'right' });
    assert.equal(p.direction, 'out');
  });

  it('defaults positionHint to null', () => {
    const p = new Port({ id: 'p1', direction: 'in', nodeId: 'n1' });
    assert.equal(p.positionHint, null);
  });

  it('throws on invalid direction', () => {
    assert.throws(
      () => new Port({ id: 'p1', direction: 'sideways', nodeId: 'n1' }),
      /Invalid port direction/,
    );
  });

  it('throws on invalid positionHint', () => {
    assert.throws(
      () => new Port({ id: 'p1', direction: 'in', nodeId: 'n1', positionHint: 'center' }),
      /Invalid positionHint/,
    );
  });

  it('toJSON() round-trips correctly', () => {
    const p = new Port({ id: 'p1', direction: 'out', nodeId: 'n1', positionHint: 'right' });
    const json = p.toJSON();
    const p2 = new Port(json);
    assert.deepEqual(p2.toJSON(), json);
  });
});

describe('Node', () => {
  it('constructs with defaults', () => {
    const n = new Node({ id: 'n1', type: 'action' });
    assert.equal(n.id, 'n1');
    assert.equal(n.type, 'action');
    assert.equal(n.x, 0);
    assert.equal(n.y, 0);
    assert.equal(n.width, 180);
    assert.equal(n.height, 60);
    assert.deepEqual(n.metadata, {});
    assert.equal(n.ports.size, 0);
  });

  it('constructs with provided x, y, metadata', () => {
    const n = new Node({ id: 'n1', type: 'trigger', metadata: { foo: 1 }, x: 50, y: 75 });
    assert.equal(n.x, 50);
    assert.equal(n.y, 75);
    assert.deepEqual(n.metadata, { foo: 1 });
  });

  it('addPort() adds a port successfully', () => {
    const n = new Node({ id: 'n1', type: 'action' });
    const p = new Port({ id: 'p1', direction: 'in', nodeId: 'n1' });
    n.addPort(p);
    assert.equal(n.ports.size, 1);
    assert.equal(n.ports.get('p1'), p);
  });

  it('addPort() throws on duplicate ID', () => {
    const n = new Node({ id: 'n1', type: 'action' });
    const p1 = new Port({ id: 'p1', direction: 'in', nodeId: 'n1' });
    const p2 = new Port({ id: 'p1', direction: 'out', nodeId: 'n1' });
    n.addPort(p1);
    assert.throws(() => n.addPort(p2), /Duplicate port ID/);
  });

  it('addPort() throws when port nodeId does not match', () => {
    const n = new Node({ id: 'n1', type: 'action' });
    const p = new Port({ id: 'p1', direction: 'in', nodeId: 'n2' });
    assert.throws(() => n.addPort(p), /nodeId/);
  });

  it('toJSON() includes ports', () => {
    const n = new Node({ id: 'n1', type: 'action', x: 10, y: 20 });
    n.addPort(new Port({ id: 'p1', direction: 'in', nodeId: 'n1', positionHint: 'left' }));
    n.addPort(new Port({ id: 'p2', direction: 'out', nodeId: 'n1', positionHint: 'right' }));
    const json = n.toJSON();
    assert.equal(json.id, 'n1');
    assert.equal(json.type, 'action');
    assert.equal(json.x, 10);
    assert.equal(json.y, 20);
    assert.equal(json.ports.length, 2);
    assert.equal(json.ports[0].id, 'p1');
    assert.equal(json.ports[1].id, 'p2');
  });
});

describe('Edge', () => {
  it('constructs correctly', () => {
    const e = new Edge({ id: 'e1', sourcePortId: 'p1', targetPortId: 'p2' });
    assert.equal(e.id, 'e1');
    assert.equal(e.sourcePortId, 'p1');
    assert.equal(e.targetPortId, 'p2');
  });

  it('is immutable', () => {
    const e = new Edge({ id: 'e1', sourcePortId: 'p1', targetPortId: 'p2' });
    assert.throws(() => { e.newProp = 'x'; }, TypeError);
  });

  it('toJSON() round-trips correctly', () => {
    const e = new Edge({ id: 'e1', sourcePortId: 'p1', targetPortId: 'p2' });
    const json = e.toJSON();
    const e2 = new Edge(json);
    assert.deepEqual(e2.toJSON(), json);
  });
});
