import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DragController } from '../dist/controllers/drag-controller.js';
import { SelectionController } from '../dist/controllers/selection-controller.js';
import { EdgeRoutingController } from '../dist/controllers/edge-routing-controller.js';
import { KeyboardController } from '../dist/controllers/keyboard-controller.js';

// Minimal stubs
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

const validOptions = { nodeSelector: 'canvas-node', portSelector: 'canvas-port' };

describe('ControllerOptions — throws without required selectors', () => {
  it('DragController throws if options is undefined', () => {
    assert.throws(() => new DragController(stubWorkspace, stubState), /requires options/);
  });

  it('DragController throws if nodeSelector is missing', () => {
    assert.throws(() => new DragController(stubWorkspace, stubState, { portSelector: 'p' }), /requires options/);
  });

  it('DragController throws if portSelector is missing', () => {
    assert.throws(() => new DragController(stubWorkspace, stubState, { nodeSelector: 'n' }), /requires options/);
  });

  it('SelectionController throws if options is undefined', () => {
    assert.throws(() => new SelectionController(stubWorkspace, stubState), /requires options/);
  });

  it('SelectionController throws if nodeSelector is missing', () => {
    assert.throws(() => new SelectionController(stubWorkspace, stubState, { portSelector: 'p' }), /requires options/);
  });

  it('EdgeRoutingController throws if options is undefined', () => {
    assert.throws(() => new EdgeRoutingController(stubWorkspace, stubState, stubEdgeLayer), /requires options/);
  });

  it('EdgeRoutingController throws if nodeSelector is missing', () => {
    assert.throws(() => new EdgeRoutingController(stubWorkspace, stubState, stubEdgeLayer, { portSelector: 'p' }), /requires options/);
  });

  it('KeyboardController throws if options is undefined', () => {
    assert.throws(() => new KeyboardController(stubWorkspace, stubState), /requires options/);
  });

  it('KeyboardController throws if nodeSelector is missing', () => {
    assert.throws(() => new KeyboardController(stubWorkspace, stubState, {}), /requires options/);
  });
});

describe('ControllerOptions — constructs with valid options', () => {
  it('DragController accepts valid options', () => {
    const ctrl = new DragController(stubWorkspace, stubState, validOptions);
    assert.ok(ctrl);
  });

  it('SelectionController accepts valid options', () => {
    const ctrl = new SelectionController(stubWorkspace, stubState, validOptions);
    assert.ok(ctrl);
  });

  it('EdgeRoutingController accepts valid options', () => {
    const ctrl = new EdgeRoutingController(stubWorkspace, stubState, stubEdgeLayer, validOptions);
    assert.ok(ctrl);
  });

  it('KeyboardController accepts valid options', () => {
    const ctrl = new KeyboardController(stubWorkspace, stubState, validOptions);
    assert.ok(ctrl);
  });
});

describe('ControllerOptions — accepts callbacks', () => {
  it('DragController accepts onNodeDrag and onNodeDragStop callbacks', () => {
    const ctrl = new DragController(stubWorkspace, stubState, {
      ...validOptions,
      onNodeDrag: () => {},
      onNodeDragStop: () => {},
    });
    assert.ok(ctrl);
  });

  it('EdgeRoutingController accepts isValidConnection and onConnect callbacks', () => {
    const ctrl = new EdgeRoutingController(stubWorkspace, stubState, stubEdgeLayer, {
      ...validOptions,
      isValidConnection: () => true,
      onConnect: () => {},
    });
    assert.ok(ctrl);
  });

  it('DragController accepts snapGrid option', () => {
    const ctrl = new DragController(stubWorkspace, stubState, {
      ...validOptions,
      snapGrid: [20, 20],
    });
    assert.ok(ctrl);
  });

  it('controllers accept arbitrary CSS selectors', () => {
    const ctrl = new EdgeRoutingController(stubWorkspace, stubState, stubEdgeLayer, {
      nodeSelector: '.my-node',
      portSelector: '[data-port]',
    });
    assert.ok(ctrl);
  });
});
