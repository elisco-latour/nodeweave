import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getStraightPath,
  getBezierPath,
  getStepPath,
  getSmoothStepPath,
  getEdgeCenter,
  buildEdgePath,
} from '../../dist/core/edge-paths.js';

const S = { x: 0, y: 0 };
const T = { x: 200, y: 100 };

describe('getStraightPath', () => {
  it('draws a single line from source to target', () => {
    assert.equal(getStraightPath(S, T), 'M 0,0 L 200,100');
  });
});

describe('getBezierPath', () => {
  it('uses horizontal control points', () => {
    // dx = 200, offset = min(100, Infinity) = 100
    assert.equal(getBezierPath(S, T), 'M 0,0 C 100,0 100,100 200,100');
  });

  it('clamps the bow to maxBow', () => {
    // offset = min(100, 150) = 100 (unchanged); with maxBow 40 -> 40
    assert.equal(getBezierPath(S, T, { maxBow: 40 }), 'M 0,0 C 40,0 160,100 200,100');
  });

  it('enforces minBow when nodes are horizontally close', () => {
    // dx = 20 -> raw offset 10, minBow 100 -> 100
    const path = getBezierPath({ x: 0, y: 0 }, { x: 20, y: 80 }, { minBow: 100 });
    assert.equal(path, 'M 0,0 C 100,0 -80,80 20,80');
  });
});

describe('getStepPath', () => {
  it('routes orthogonally through the horizontal midpoint', () => {
    // midX = 100
    assert.equal(getStepPath(S, T), 'M 0,0 L 100,0 L 100,100 L 200,100');
  });

  it('degenerates to a straight line when source and target share a row', () => {
    assert.equal(getStepPath({ x: 0, y: 50 }, { x: 200, y: 50 }), 'M 0,50 L 200,50');
  });
});

describe('getSmoothStepPath', () => {
  it('produces rounded corners with Q commands', () => {
    const path = getSmoothStepPath(S, T, { borderRadius: 8 });
    // Two quadratic corners at the midpoint
    assert.match(path, /^M 0,0 /);
    assert.equal((path.match(/Q /g) ?? []).length, 2);
    assert.match(path, / L 200,100$/);
  });

  it('clamps the radius so corners never overshoot', () => {
    // dy = 4 -> radius clamped to dy/2 = 2, not 8
    const path = getSmoothStepPath({ x: 0, y: 0 }, { x: 200, y: 4 }, { borderRadius: 8 });
    assert.ok(path.includes('2'), 'radius should be clamped to 2');
  });

  it('degenerates to a straight line when source and target share a row', () => {
    assert.equal(getSmoothStepPath({ x: 0, y: 50 }, { x: 200, y: 50 }), 'M 0,50 L 200,50');
  });
});

describe('getEdgeCenter', () => {
  it('returns the geometric midpoint', () => {
    assert.deepEqual(getEdgeCenter(S, T), { x: 100, y: 50 });
  });

  it('handles negative offsets', () => {
    assert.deepEqual(getEdgeCenter({ x: 200, y: 100 }, { x: 0, y: 0 }), { x: 100, y: 50 });
  });
});

describe('buildEdgePath dispatcher', () => {
  it('dispatches by type', () => {
    assert.equal(buildEdgePath('straight', S, T), getStraightPath(S, T));
    assert.equal(buildEdgePath('step', S, T), getStepPath(S, T));
    assert.equal(buildEdgePath('smoothstep', S, T), getSmoothStepPath(S, T));
    assert.equal(buildEdgePath('bezier', S, T), getBezierPath(S, T));
  });

  it('defaults unknown types to bezier', () => {
    assert.equal(buildEdgePath('nonsense', S, T), getBezierPath(S, T));
  });
});
