import { test, expect } from '@playwright/test';

test.describe('canvas-node', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/component/fixtures/canvas-node-fixture.html');
    await page.waitForFunction(() => window.__ready === true);
  });

  test('renders with label and header', async ({ page }) => {
    await page.evaluate(() => {
      const node = document.createElement('canvas-node');
      node.nodeId = 'n1';
      node.nodeKind = 'action';
      node.label = 'My Action';
      document.body.appendChild(node);
    });

    const nodeEl = page.locator('canvas-node');
    await expect(nodeEl).toBeVisible();

    // Check Shadow DOM contents
    const labelText = await nodeEl.evaluate((el) =>
      el.shadowRoot.querySelector('.label').textContent,
    );
    expect(labelText).toBe('My Action');

    const headerEl = await nodeEl.evaluate((el) =>
      el.shadowRoot.querySelector('.header') !== null,
    );
    expect(headerEl).toBe(true);
  });

  test('has correct ARIA attributes', async ({ page }) => {
    await page.evaluate(() => {
      const node = document.createElement('canvas-node');
      node.nodeId = 'n1';
      node.nodeKind = 'action';
      node.label = 'My Action';
      document.body.appendChild(node);
    });

    const nodeEl = page.locator('canvas-node');
    await expect(nodeEl).toHaveAttribute('role', 'treeitem');
    await expect(nodeEl).toHaveAttribute('tabindex', '0');
    await expect(nodeEl).toHaveAttribute('aria-label', 'My Action node');
    await expect(nodeEl).toHaveAttribute('aria-grabbed', 'false');
    await expect(nodeEl).toHaveAttribute('aria-roledescription', 'graph node');
  });

  test('is focusable via Tab', async ({ page }) => {
    await page.evaluate(() => {
      const node = document.createElement('canvas-node');
      node.nodeId = 'n1';
      node.nodeKind = 'action';
      node.label = 'Test Node';
      document.body.appendChild(node);
    });

    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() =>
      document.activeElement?.tagName.toLowerCase(),
    );
    expect(focused).toBe('canvas-node');
  });

  test('setPosition updates CSS variables', async ({ page }) => {
    await page.evaluate(() => {
      const node = document.createElement('canvas-node');
      node.nodeId = 'n1';
      node.nodeKind = 'action';
      node.label = 'Test';
      document.body.appendChild(node);
      node.setPosition(150, 250);
    });

    const nodeEl = page.locator('canvas-node');
    const xVar = await nodeEl.evaluate((el) =>
      el.style.getPropertyValue('--x'),
    );
    const yVar = await nodeEl.evaluate((el) =>
      el.style.getPropertyValue('--y'),
    );
    expect(xVar).toBe('150');
    expect(yVar).toBe('250');
  });

  test('renders correct number of ports', async ({ page }) => {
    await page.evaluate(() => {
      const { Node, Port } = window;
      const domNode = document.createElement('canvas-node');
      domNode.nodeId = 'n1';
      domNode.nodeKind = 'action';
      domNode.label = 'Action';

      const ports = [
        new Port({ id: 'in1', direction: 'in', nodeId: 'n1' }),
        new Port({ id: 'out1', direction: 'out', nodeId: 'n1' }),
        new Port({ id: 'out2', direction: 'out', nodeId: 'n1' }),
      ];
      domNode.ports = ports;
      document.body.appendChild(domNode);
    });

    const nodeEl = page.locator('canvas-node');

    const inPortCount = await nodeEl.evaluate((el) =>
      el.shadowRoot.querySelector('.ports-in').querySelectorAll('canvas-port').length,
    );
    expect(inPortCount).toBe(1);

    const outPortCount = await nodeEl.evaluate((el) =>
      el.shadowRoot.querySelector('.ports-out').querySelectorAll('canvas-port').length,
    );
    expect(outPortCount).toBe(2);
  });

  test('responds to CanvasState node-moved event', async ({ page }) => {
    await page.evaluate(() => {
      const { CanvasState, Node, Port } = window;
      const state = new CanvasState();
      const node = new Node({ id: 'n1', type: 'action', x: 0, y: 0 });
      node.addPort(new Port({ id: 'in1', direction: 'in', nodeId: 'n1' }));
      state.addNode(node);

      const domNode = document.createElement('canvas-node');
      domNode.nodeId = 'n1';
      domNode.nodeKind = 'action';
      domNode.label = 'Action';
      domNode.state = state;
      document.body.appendChild(domNode);

      window.__state = state;
    });

    // Move the node via CanvasState
    await page.evaluate(() => {
      window.__state.setNodePosition('n1', 300, 400);
    });

    const nodeEl = page.locator('canvas-node');
    const xVar = await nodeEl.evaluate((el) =>
      el.style.getPropertyValue('--x'),
    );
    const yVar = await nodeEl.evaluate((el) =>
      el.style.getPropertyValue('--y'),
    );
    expect(xVar).toBe('300');
    expect(yVar).toBe('400');
  });
});
