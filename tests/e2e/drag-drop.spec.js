import { test, expect } from '@playwright/test';

const FIXTURE = '/tests/e2e/fixtures/e2e-fixture.html';

test.beforeEach(async ({ page }) => {
  await page.goto(FIXTURE);
  await page.waitForFunction(() => window.__ready === true);
});

test('drag node updates position in CanvasState', async ({ page }) => {
  const before = await page.evaluate(() => {
    const node = window.__state.nodes.get('node-a');
    return { x: node.x, y: node.y };
  });

  // Get bounding box of node-a via evaluate (it's in shadow DOM)
  const box = await page.evaluate(() => {
    const ws = window.__workspace;
    const node = ws.shadowRoot.querySelector('canvas-node');
    const rect = node.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 100, cy + 50, { steps: 10 });
  await page.mouse.up();

  const after = await page.evaluate(() => {
    const node = window.__state.nodes.get('node-a');
    return { x: node.x, y: node.y };
  });

  expect(after.x).not.toEqual(before.x);
  expect(after.y).not.toEqual(before.y);
});

test('drag creates an undoable command', async ({ page }) => {
  const before = await page.evaluate(() => {
    const node = window.__state.nodes.get('node-a');
    return { x: node.x, y: node.y };
  });

  const box = await page.evaluate(() => {
    const ws = window.__workspace;
    const node = ws.shadowRoot.querySelector('canvas-node');
    const rect = node.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 80, cy + 40, { steps: 10 });
  await page.mouse.up();

  // Undo
  await page.evaluate(() => window.__state.commandHistory.undo());

  const undone = await page.evaluate(() => {
    const node = window.__state.nodes.get('node-a');
    return { x: node.x, y: node.y };
  });

  expect(undone.x).toBeCloseTo(before.x, 0);
  expect(undone.y).toBeCloseTo(before.y, 0);
});

test('aria-grabbed toggles during drag', async ({ page }) => {
  const box = await page.evaluate(() => {
    const ws = window.__workspace;
    const node = ws.shadowRoot.querySelector('canvas-node');
    const rect = node.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });

  // Before drag
  const grabbedBefore = await page.evaluate(() => {
    return window.__workspace.shadowRoot.querySelector('canvas-node').getAttribute('aria-grabbed');
  });
  expect(grabbedBefore).toBe('false');

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 50, cy + 50, { steps: 5 });

  // During drag — wait briefly for RAF
  await page.waitForTimeout(100);
  const grabbedDuring = await page.evaluate(() => {
    return window.__workspace.shadowRoot.querySelector('canvas-node').getAttribute('aria-grabbed');
  });
  expect(grabbedDuring).toBe('true');

  await page.mouse.up();

  // After drag
  const grabbedAfter = await page.evaluate(() => {
    return window.__workspace.shadowRoot.querySelector('canvas-node').getAttribute('aria-grabbed');
  });
  expect(grabbedAfter).toBe('false');
});
