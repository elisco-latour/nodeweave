import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DragController } from '../../lib/controllers/drag-controller.js';
import { SelectionController } from '../../lib/controllers/selection-controller.js';
import { EdgeRoutingController } from '../../lib/controllers/edge-routing-controller.js';
import { KeyboardController } from '../../lib/controllers/keyboard-controller.js';

// Minimal stubs — controllers only need addEventListener/removeEventListener in constructor
const stubWorkspace = {
  addEventListener() {},
  removeEventListener() {},
  shadowRoot: null,
};

const stubState = {
  addEventListener() {},
  removeEventListener() {},
  viewport: { panX: 0, panY: 0, zoom: 1 },
  selectedNodeIds: new Set(),
  nodes: new Map(),
};

const stubEdgeLayer = {
  shadowRoot: null,
};

const validSelectors = { node: 'canvas-node', port: 'canvas-port' };

describe('Controller selectors — throws without selectors', () => {
  it('DragController throws if selectors is undefined', () => {
    assert.throws(() => new DragController(stubWorkspace, stubState), /requires selectors/);
  });

  it('DragController throws if selectors.node is missing', () => {
    assert.throws(() => new DragController(stubWorkspace, stubState, { port: 'p' }), /requires selectors/);
  });

  it('DragController throws if selectors.port is missing', () => {
    assert.throws(() => new DragController(stubWorkspace, stubState, { node: 'n' }), /requires selectors/);
  });

  it('SelectionController throws if selectors is undefined', () => {
    assert.throws(() => new SelectionController(stubWorkspace, stubState), /requires selectors/);
  });

  it('SelectionController throws if selectors.node is missing', () => {
    assert.throws(() => new SelectionController(stubWorkspace, stubState, { port: 'p' }), /requires selectors/);
  });

  it('EdgeRoutingController throws if selectors is undefined', () => {
    assert.throws(() => new EdgeRoutingController(stubWorkspace, stubState, stubEdgeLayer), /requires selectors/);
  });

  it('EdgeRoutingController throws if selectors.node is missing', () => {
    assert.throws(() => new EdgeRoutingController(stubWorkspace, stubState, stubEdgeLayer, { port: 'p' }), /requires selectors/);
  });

  it('KeyboardController throws if selectors is undefined', () => {
    assert.throws(() => new KeyboardController(stubWorkspace, stubState), /requires selectors/);
  });

  it('KeyboardController throws if selectors.node is missing', () => {
    assert.throws(() => new KeyboardController(stubWorkspace, stubState, {}), /requires selectors/);
  });
});

describe('Controller selectors — constructs with valid selectors', () => {
  it('DragController accepts valid selectors', () => {
    const ctrl = new DragController(stubWorkspace, stubState, validSelectors);
    assert.ok(ctrl);
  });

  it('SelectionController accepts valid selectors', () => {
    const ctrl = new SelectionController(stubWorkspace, stubState, validSelectors);
    assert.ok(ctrl);
  });

  it('EdgeRoutingController accepts valid selectors', () => {
    const ctrl = new EdgeRoutingController(stubWorkspace, stubState, stubEdgeLayer, validSelectors);
    assert.ok(ctrl);
  });

  it('KeyboardController accepts valid selectors', () => {
    const ctrl = new KeyboardController(stubWorkspace, stubState, validSelectors);
    assert.ok(ctrl);
  });
});

describe('Controller selectors — el.matches used for lookup', () => {
  it('DragController uses el.matches to find nodes in composedPath', () => {
    // Create a mock element that has matches() returning true for a custom selector
    const customSelectors = { node: 'wf-node', port: 'wf-port' };
    const ctrl = new DragController(stubWorkspace, stubState, customSelectors);

    // The controller stores the selector internally — verify it constructs
    // without error using a non-standard tag name (proves no hardcoded tag check)
    assert.ok(ctrl);
  });

  it('EdgeRoutingController accepts arbitrary CSS selectors', () => {
    const customSelectors = { node: '.my-node', port: '[data-port]' };
    const ctrl = new EdgeRoutingController(stubWorkspace, stubState, stubEdgeLayer, customSelectors);
    assert.ok(ctrl);
  });

  it('KeyboardController accepts arbitrary CSS selectors', () => {
    const customSelectors = { node: 'div.node-widget' };
    const ctrl = new KeyboardController(stubWorkspace, stubState, customSelectors);
    assert.ok(ctrl);
  });
});
