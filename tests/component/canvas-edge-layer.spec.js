import { test, expect } from '@playwright/test';

test.describe('canvas-edge-layer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/component/fixtures/canvas-edge-layer-fixture.html');
    await page.waitForFunction(() => window.__ready === true);
  });

  test('renders SVG paths for edges', async ({ page }) => {
    await page.evaluate(() => {
      const { CanvasState, Node, Port, Edge } = window;
      const state = new CanvasState();

      // Create 3 nodes with ports
      const n1 = new Node({ id: 'n1', type: 'trigger', x: 0, y: 0 });
      n1.addPort(new Port({ id: 'n1-out', direction: 'out', nodeId: 'n1' }));
      state.addNode(n1);

      const n2 = new Node({ id: 'n2', type: 'action', x: 250, y: 0 });
      n2.addPort(new Port({ id: 'n2-in', direction: 'in', nodeId: 'n2' }));
      n2.addPort(new Port({ id: 'n2-out', direction: 'out', nodeId: 'n2' }));
      state.addNode(n2);

      const n3 = new Node({ id: 'n3', type: 'action', x: 500, y: 100 });
      n3.addPort(new Port({ id: 'n3-in', direction: 'in', nodeId: 'n3' }));
      state.addNode(n3);

      // Create 2 edges
      state.addEdge(new Edge({ id: 'e1', sourcePortId: 'n1-out', targetPortId: 'n2-in' }));
      state.addEdge(new Edge({ id: 'e2', sourcePortId: 'n2-out', targetPortId: 'n3-in' }));

      const layer = document.createElement('canvas-edge-layer');
      layer.style.width = '800px';
      layer.style.height = '600px';
      layer.state = state;
      document.body.appendChild(layer);

      window.__state = state;
    });

    const pathCount = await page.evaluate(() => {
      const layer = document.querySelector('canvas-edge-layer');
      return layer.shadowRoot.querySelectorAll('path').length;
    });
    expect(pathCount).toBe(2);
  });

  test('updates path when node moves', async ({ page }) => {
    await page.evaluate(() => {
      const { CanvasState, Node, Port, Edge } = window;
      const state = new CanvasState();

      const n1 = new Node({ id: 'n1', type: 'trigger', x: 0, y: 0 });
      n1.addPort(new Port({ id: 'n1-out', direction: 'out', nodeId: 'n1' }));
      state.addNode(n1);

      const n2 = new Node({ id: 'n2', type: 'action', x: 250, y: 0 });
      n2.addPort(new Port({ id: 'n2-in', direction: 'in', nodeId: 'n2' }));
      state.addNode(n2);

      state.addEdge(new Edge({ id: 'e1', sourcePortId: 'n1-out', targetPortId: 'n2-in' }));

      const layer = document.createElement('canvas-edge-layer');
      layer.style.width = '800px';
      layer.style.height = '600px';
      layer.state = state;
      document.body.appendChild(layer);

      window.__state = state;
    });

    // Get initial path
    const initialD = await page.evaluate(() => {
      const layer = document.querySelector('canvas-edge-layer');
      return layer.shadowRoot.querySelector('path').getAttribute('d');
    });

    // Move node
    await page.evaluate(() => {
      window.__state.setNodePosition('n1', 100, 200);
    });

    // Check path changed
    const updatedD = await page.evaluate(() => {
      const layer = document.querySelector('canvas-edge-layer');
      return layer.shadowRoot.querySelector('path').getAttribute('d');
    });
    expect(updatedD).not.toBe(initialD);
  });

  test('adds path when edge is added', async ({ page }) => {
    await page.evaluate(() => {
      const { CanvasState, Node, Port, Edge } = window;
      const state = new CanvasState();

      const n1 = new Node({ id: 'n1', type: 'trigger', x: 0, y: 0 });
      n1.addPort(new Port({ id: 'n1-out', direction: 'out', nodeId: 'n1' }));
      state.addNode(n1);

      const n2 = new Node({ id: 'n2', type: 'action', x: 250, y: 0 });
      n2.addPort(new Port({ id: 'n2-in', direction: 'in', nodeId: 'n2' }));
      n2.addPort(new Port({ id: 'n2-out', direction: 'out', nodeId: 'n2' }));
      state.addNode(n2);

      const n3 = new Node({ id: 'n3', type: 'action', x: 500, y: 100 });
      n3.addPort(new Port({ id: 'n3-in', direction: 'in', nodeId: 'n3' }));
      state.addNode(n3);

      state.addEdge(new Edge({ id: 'e1', sourcePortId: 'n1-out', targetPortId: 'n2-in' }));
      state.addEdge(new Edge({ id: 'e2', sourcePortId: 'n2-out', targetPortId: 'n3-in' }));

      const layer = document.createElement('canvas-edge-layer');
      layer.style.width = '800px';
      layer.style.height = '600px';
      layer.state = state;
      document.body.appendChild(layer);

      window.__state = state;
      window.__Edge = Edge;
    });

    // Initially 2 paths
    let pathCount = await page.evaluate(() => {
      const layer = document.querySelector('canvas-edge-layer');
      return layer.shadowRoot.querySelectorAll('path').length;
    });
    expect(pathCount).toBe(2);

    // Add new node and edge
    await page.evaluate(() => {
      const { Node, Port, Edge } = window;
      const n4 = new Node({ id: 'n4', type: 'action', x: 500, y: 250 });
      n4.addPort(new Port({ id: 'n4-in', direction: 'in', nodeId: 'n4' }));
      window.__state.addNode(n4);
      window.__state.addEdge(new Edge({ id: 'e3', sourcePortId: 'n2-out', targetPortId: 'n4-in' }));
    });

    pathCount = await page.evaluate(() => {
      const layer = document.querySelector('canvas-edge-layer');
      return layer.shadowRoot.querySelectorAll('path').length;
    });
    expect(pathCount).toBe(3);
  });

  test('removes path when edge is removed', async ({ page }) => {
    await page.evaluate(() => {
      const { CanvasState, Node, Port, Edge } = window;
      const state = new CanvasState();

      const n1 = new Node({ id: 'n1', type: 'trigger', x: 0, y: 0 });
      n1.addPort(new Port({ id: 'n1-out', direction: 'out', nodeId: 'n1' }));
      state.addNode(n1);

      const n2 = new Node({ id: 'n2', type: 'action', x: 250, y: 0 });
      n2.addPort(new Port({ id: 'n2-in', direction: 'in', nodeId: 'n2' }));
      n2.addPort(new Port({ id: 'n2-out', direction: 'out', nodeId: 'n2' }));
      state.addNode(n2);

      const n3 = new Node({ id: 'n3', type: 'action', x: 500, y: 100 });
      n3.addPort(new Port({ id: 'n3-in', direction: 'in', nodeId: 'n3' }));
      state.addNode(n3);

      state.addEdge(new Edge({ id: 'e1', sourcePortId: 'n1-out', targetPortId: 'n2-in' }));
      state.addEdge(new Edge({ id: 'e2', sourcePortId: 'n2-out', targetPortId: 'n3-in' }));

      const layer = document.createElement('canvas-edge-layer');
      layer.style.width = '800px';
      layer.style.height = '600px';
      layer.state = state;
      document.body.appendChild(layer);

      window.__state = state;
    });

    // Remove an edge
    await page.evaluate(() => {
      window.__state.removeEdge('e1');
    });

    const pathCount = await page.evaluate(() => {
      const layer = document.querySelector('canvas-edge-layer');
      return layer.shadowRoot.querySelectorAll('path').length;
    });
    expect(pathCount).toBe(1);
  });

  test('SVG has aria-hidden', async ({ page }) => {
    await page.evaluate(() => {
      const layer = document.createElement('canvas-edge-layer');
      document.body.appendChild(layer);
    });

    const ariaHidden = await page.evaluate(() => {
      const layer = document.querySelector('canvas-edge-layer');
      return layer.shadowRoot.querySelector('svg').getAttribute('aria-hidden');
    });
    expect(ariaHidden).toBe('true');
  });
});
