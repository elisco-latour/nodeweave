import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { screenToFlowPosition, flowToScreenPosition } from '../dist/core/coords.js';

describe('screenToFlowPosition', () => {
  it('is identity at the origin viewport with no offset', () => {
    const vp = { panX: 0, panY: 0, zoom: 1 };
    assert.deepEqual(screenToFlowPosition({ x: 40, y: 60 }, vp), { x: 40, y: 60 });
  });

  it('undoes pan and zoom', () => {
    const vp = { panX: 100, panY: 50, zoom: 2 };
    // A node at flow (30,20) sits at screen 30*2+100=160, 20*2+50=90.
    assert.deepEqual(screenToFlowPosition({ x: 160, y: 90 }, vp), { x: 30, y: 20 });
  });

  it('subtracts the surface offset', () => {
    const vp = { panX: 0, panY: 0, zoom: 1 };
    const offset = { left: 25, top: 15 };
    assert.deepEqual(screenToFlowPosition({ x: 125, y: 115 }, vp, offset), { x: 100, y: 100 });
  });
});

describe('flowToScreenPosition', () => {
  it('is the inverse of screenToFlowPosition', () => {
    const vp = { panX: 100, panY: 50, zoom: 1.5 };
    const offset = { left: 12, top: 8 };
    const screen = { x: 321, y: 205 };
    const flow = screenToFlowPosition(screen, vp, offset);
    assert.deepEqual(flowToScreenPosition(flow, vp, offset), screen);
  });
});
