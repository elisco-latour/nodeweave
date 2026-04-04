import { test, expect } from '@playwright/test';

test.describe('wf-edge-layer phantom edge and _getPortPosition', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/component/fixtures/wf-edge-layer-phantom-fixture.html');
    await page.waitForFunction(() => window.__ready === true);
  });

  test('_getPortPosition returns { x, y } for a valid port', async ({ page }) => {
    const pos = await page.evaluate(() => {
      const { CanvasState, Node, Port } = window;
      const state = new CanvasState();

      const n1 = new Node({ id: 'n1', type: 'action', x: 100, y: 50, width: 280, height: 100 });
      n1.addPort(new Port({ id: 'p-out', direction: 'out', nodeId: 'n1' }));
      state.addNode(n1);

      const layer = document.createElement('wf-edge-layer');
      layer.state = state;
      document.body.appendChild(layer);

      return layer._getPortPosition('p-out');
    });

    expect(pos).toBeDefined();
    expect(typeof pos.x).toBe('number');
    expect(typeof pos.y).toBe('number');
  });

  test('_getPortPosition returns null for unknown port', async ({ page }) => {
    const pos = await page.evaluate(() => {
      const { CanvasState } = window;
      const state = new CanvasState();

      const layer = document.createElement('wf-edge-layer');
      layer.state = state;
      document.body.appendChild(layer);

      return layer._getPortPosition('nonexistent');
    });

    expect(pos).toBeNull();
  });

  test('phantom path CSS has correct stroke-dasharray and opacity', async ({ page }) => {
    const styles = await page.evaluate(() => {
      const layer = document.createElement('wf-edge-layer');
      document.body.appendChild(layer);

      // Inject a phantom path into the shadow SVG
      const svg = layer.shadowRoot.querySelector('svg');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.classList.add('phantom');
      path.setAttribute('d', 'M 0 0 L 100 100');
      svg.appendChild(path);

      const computed = getComputedStyle(path);
      return {
        strokeDasharray: computed.strokeDasharray,
        opacity: computed.opacity,
      };
    });

    expect(styles.strokeDasharray).toBe('8px, 4px');
    expect(styles.opacity).toBe('0.5');
  });
});
