import { test, expect } from '@playwright/test';

test.describe('wf-workspace viewport culling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/component/fixtures/wf-viewport-culling-fixture.html');
    await page.waitForFunction(() => window.__ready === true);
  });

  test('nodes outside viewport are hidden (display: none)', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { CanvasState, Node, Port } = window;
      const state = new CanvasState();

      const ws = document.createElement('wf-workspace');
      ws.style.width = '800px';
      ws.style.height = '600px';
      document.body.appendChild(ws);
      ws.state = state;

      // Node inside viewport (near origin)
      const n1 = new Node({ id: 'n1', type: 'action', x: 50, y: 50, width: 200, height: 100 });
      n1.addPort(new Port({ id: 'n1:out', direction: 'out', nodeId: 'n1' }));
      state.addNode(n1);

      // Node far outside viewport
      const n2 = new Node({ id: 'n2', type: 'action', x: 5000, y: 5000, width: 200, height: 100 });
      n2.addPort(new Port({ id: 'n2:in', direction: 'in', nodeId: 'n2' }));
      state.addNode(n2);

      // Read the wf-node elements inside shadow DOM
      const vp = ws.shadowRoot.querySelector('.viewport');
      const nodes = vp.querySelectorAll('wf-node');
      const displays = {};
      for (const el of nodes) {
        displays[el.nodeId] = el.style.display;
      }
      return displays;
    });

    expect(result['n1']).toBe('');
    expect(result['n2']).toBe('none');
  });

  test('nodes become visible when viewport pans to them', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { CanvasState, Node, Port } = window;
      const state = new CanvasState();

      const ws = document.createElement('wf-workspace');
      ws.style.width = '800px';
      ws.style.height = '600px';
      document.body.appendChild(ws);
      ws.state = state;

      // Node far away
      const n1 = new Node({ id: 'n1', type: 'action', x: 3000, y: 3000, width: 200, height: 100 });
      state.addNode(n1);

      const vp = ws.shadowRoot.querySelector('.viewport');
      const getDisplay = () => vp.querySelector('wf-node').style.display;

      const beforePan = getDisplay();

      // Pan viewport so that (3000, 3000) is visible
      // panX = -3000, panY = -3000 at zoom 1 → viewport starts at canvas x=3000, y=3000
      state.setViewport(-3000, -3000, 1);

      const afterPan = getDisplay();

      return { beforePan, afterPan };
    });

    expect(result.beforePan).toBe('none');
    expect(result.afterPan).toBe('');
  });

  test('edge layer setVisibleNodes is called with correct IDs', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { CanvasState, Node, Port, Edge } = window;
      const state = new CanvasState();

      const ws = document.createElement('wf-workspace');
      ws.style.width = '800px';
      ws.style.height = '600px';
      document.body.appendChild(ws);
      ws.state = state;

      // Spy on the edge layer's setVisibleNodes
      const edgeLayer = ws.shadowRoot.querySelector('wf-edge-layer');
      let capturedIds = null;
      const original = edgeLayer.setVisibleNodes.bind(edgeLayer);
      edgeLayer.setVisibleNodes = (ids) => {
        capturedIds = [...ids];
        original(ids);
      };

      const n1 = new Node({ id: 'n1', type: 'action', x: 50, y: 50, width: 200, height: 100 });
      n1.addPort(new Port({ id: 'n1:out', direction: 'out', nodeId: 'n1' }));
      state.addNode(n1);

      const n2 = new Node({ id: 'n2', type: 'action', x: 5000, y: 5000, width: 200, height: 100 });
      n2.addPort(new Port({ id: 'n2:in', direction: 'in', nodeId: 'n2' }));
      state.addNode(n2);

      return { capturedIds: capturedIds ? capturedIds.sort() : null };
    });

    expect(result.capturedIds).toBeTruthy();
    expect(result.capturedIds).toContain('n1');
    expect(result.capturedIds).not.toContain('n2');
  });

  test('edges to hidden nodes are not rendered', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { CanvasState, Node, Port, Edge } = window;
      const state = new CanvasState();

      const ws = document.createElement('wf-workspace');
      ws.style.width = '800px';
      ws.style.height = '600px';
      document.body.appendChild(ws);
      ws.state = state;

      const n1 = new Node({ id: 'n1', type: 'action', x: 50, y: 50, width: 200, height: 100 });
      n1.addPort(new Port({ id: 'n1:out', direction: 'out', nodeId: 'n1' }));
      state.addNode(n1);

      const n2 = new Node({ id: 'n2', type: 'action', x: 5000, y: 5000, width: 200, height: 100 });
      n2.addPort(new Port({ id: 'n2:in', direction: 'in', nodeId: 'n2' }));
      state.addNode(n2);

      state.addEdge(new Edge({ id: 'e1', sourcePortId: 'n1:out', targetPortId: 'n2:in' }));

      const edgeLayer = ws.shadowRoot.querySelector('wf-edge-layer');
      const svg = edgeLayer.shadowRoot.querySelector('svg');
      const paths = svg.querySelectorAll('path');

      // n1 is visible, n2 is not, but the edge connects a visible node → should still show
      // (edge is visible if EITHER source or target is visible)
      const pathDisplays = [];
      for (const p of paths) {
        pathDisplays.push(p.style.display);
      }
      return pathDisplays;
    });

    // Edge touches n1 (visible), so it should render
    expect(result.length).toBe(1);
    expect(result[0]).toBe('');
  });

  test('edge hidden when neither endpoint node is visible', async ({ page }) => {
    const result = await page.evaluate(() => {
      const { CanvasState, Node, Port, Edge } = window;
      const state = new CanvasState();

      const ws = document.createElement('wf-workspace');
      ws.style.width = '800px';
      ws.style.height = '600px';
      document.body.appendChild(ws);
      ws.state = state;

      // Both nodes far offscreen
      const n1 = new Node({ id: 'n1', type: 'action', x: 3000, y: 3000, width: 200, height: 100 });
      n1.addPort(new Port({ id: 'n1:out', direction: 'out', nodeId: 'n1' }));
      state.addNode(n1);

      const n2 = new Node({ id: 'n2', type: 'action', x: 5000, y: 5000, width: 200, height: 100 });
      n2.addPort(new Port({ id: 'n2:in', direction: 'in', nodeId: 'n2' }));
      state.addNode(n2);

      state.addEdge(new Edge({ id: 'e1', sourcePortId: 'n1:out', targetPortId: 'n2:in' }));

      const edgeLayer = ws.shadowRoot.querySelector('wf-edge-layer');
      const svg = edgeLayer.shadowRoot.querySelector('svg');
      const path = svg.querySelector('path');

      return path ? path.style.display : 'no path';
    });

    expect(result).toBe('none');
  });
});
