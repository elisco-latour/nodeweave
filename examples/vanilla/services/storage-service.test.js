import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// Minimal localStorage mock for Node.js
function createLocalStorageMock() {
  const store = new Map();
  return {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); },
    key(index) { return [...store.keys()][index] ?? null; },
    get length() { return store.size; },
    clear() { store.clear(); },
  };
}

// We need to set up globalThis.localStorage before importing
globalThis.localStorage = createLocalStorageMock();

const { StorageService } = await import('./storage-service.js');

describe('StorageService', () => {
  let svc;

  beforeEach(() => {
    localStorage.clear();
    svc = new StorageService();
  });

  it('save and load a pipeline — data matches', () => {
    const fakeState = {
      toJSON() {
        return {
          nodes: [{ id: 'n1', type: 'action', x: 10, y: 20, width: 180, height: 60, ports: [] }],
          edges: [],
          viewport: { panX: 0, panY: 0, zoom: 1 },
        };
      },
    };

    svc.save('test-pipe', fakeState);
    const loaded = svc.load('test-pipe');

    assert.deepStrictEqual(loaded.nodes, fakeState.toJSON().nodes);
    assert.deepStrictEqual(loaded.edges, fakeState.toJSON().edges);
    assert.deepStrictEqual(loaded.viewport, fakeState.toJSON().viewport);
    assert.ok(typeof loaded.savedAt === 'number');
  });

  it('list returns correct names', () => {
    const fakeState = { toJSON: () => ({ nodes: [], edges: [], viewport: {} }) };

    svc.save('alpha', fakeState);
    svc.save('beta', fakeState);
    svc.save('gamma', fakeState);

    const names = svc.list();
    assert.equal(names.length, 3);
    assert.ok(names.includes('alpha'));
    assert.ok(names.includes('beta'));
    assert.ok(names.includes('gamma'));
  });

  it('delete removes entry', () => {
    const fakeState = { toJSON: () => ({ nodes: [], edges: [], viewport: {} }) };
    svc.save('to-delete', fakeState);

    assert.ok(svc.load('to-delete') !== null);
    svc.delete('to-delete');
    assert.equal(svc.load('to-delete'), null);
    assert.ok(!svc.list().includes('to-delete'));
  });

  it('load non-existent name returns null', () => {
    const result = svc.load('does-not-exist');
    assert.equal(result, null);
  });

  it('storage key prefix is pipeline:', () => {
    const fakeState = { toJSON: () => ({ nodes: [], edges: [], viewport: {} }) };
    svc.save('my-pipe', fakeState);

    assert.ok(localStorage.getItem('pipeline:my-pipe') !== null);
    assert.equal(localStorage.getItem('my-pipe'), null);
  });
});
