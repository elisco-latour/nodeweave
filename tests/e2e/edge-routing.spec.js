import { test, expect } from '@playwright/test';

const FIXTURE = '/tests/e2e/fixtures/e2e-fixture.html';

test.beforeEach(async ({ page }) => {
  await page.goto(FIXTURE);
  await page.waitForFunction(() => window.__ready === true);
});

test('drag from output port to input port creates an edge', async ({ page }) => {
  const edgeCountBefore = await page.evaluate(() => window.__state.edges.size);

  // Get port positions via nested shadow DOM traversal
  const positions = await page.evaluate(() => {
    const ws = window.__workspace;
    const nodeEls = ws.shadowRoot.querySelectorAll('canvas-node');
    const ports = {};
    for (const nodeEl of nodeEls) {
      const portEls = nodeEl.shadowRoot.querySelectorAll('canvas-port');
      for (const p of portEls) {
        const rect = p.getBoundingClientRect();
        ports[p.portId] = {
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
          width: rect.width,
          height: rect.height,
          direction: p.direction,
          nodeId: p.nodeId,
        };
      }
    }
    return ports;
  });

  const sourcePort = positions['port-a-out'];
  const targetPort = positions['port-b-in'];

  // Drag from output port of node-a to input port of node-b
  await page.mouse.move(sourcePort.x, sourcePort.y);
  await page.mouse.down();
  await page.mouse.move(targetPort.x, targetPort.y, { steps: 10 });
  await page.mouse.up();

  const edgeCountAfter = await page.evaluate(() => window.__state.edges.size);
  expect(edgeCountAfter).toBe(edgeCountBefore + 1);
});

test('drag from port to empty space creates no edge', async ({ page }) => {
  const edgeCountBefore = await page.evaluate(() => window.__state.edges.size);

  const portPos = await page.evaluate(() => {
    const ws = window.__workspace;
    const nodeEls = ws.shadowRoot.querySelectorAll('canvas-node');
    for (const nodeEl of nodeEls) {
      const portEls = nodeEl.shadowRoot.querySelectorAll('canvas-port');
      for (const p of portEls) {
        if (p.portId === 'port-a-out') {
          const rect = p.getBoundingClientRect();
          return {
            x: rect.x + rect.width / 2,
            y: rect.y + rect.height / 2,
          };
        }
      }
    }
  });

  // Drag from output port to empty space
  await page.mouse.move(portPos.x, portPos.y);
  await page.mouse.down();
  await page.mouse.move(600, 500, { steps: 10 });
  await page.mouse.up();

  const edgeCountAfter = await page.evaluate(() => window.__state.edges.size);
  expect(edgeCountAfter).toBe(edgeCountBefore);
});

test('escape cancels edge routing', async ({ page }) => {
  const portPos = await page.evaluate(() => {
    const ws = window.__workspace;
    const nodeEls = ws.shadowRoot.querySelectorAll('canvas-node');
    for (const nodeEl of nodeEls) {
      const portEls = nodeEl.shadowRoot.querySelectorAll('canvas-port');
      for (const p of portEls) {
        if (p.portId === 'port-a-out') {
          const rect = p.getBoundingClientRect();
          return {
            x: rect.x + rect.width / 2,
            y: rect.y + rect.height / 2,
          };
        }
      }
    }
  });

  await page.mouse.move(portPos.x, portPos.y);
  await page.mouse.down();
  await page.mouse.move(300, 300, { steps: 5 });

  // Press Escape to cancel
  await page.keyboard.press('Escape');
  await page.mouse.up();

  const edgeCount = await page.evaluate(() => window.__state.edges.size);
  expect(edgeCount).toBe(0);
});
