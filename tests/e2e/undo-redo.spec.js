import { test, expect } from '@playwright/test';

const FIXTURE = '/tests/e2e/fixtures/e2e-fixture.html';

test.beforeEach(async ({ page }) => {
  await page.goto(FIXTURE);
  await page.waitForFunction(() => window.__ready === true);
});

test('Ctrl+Z undoes node move', async ({ page }) => {
  const before = await page.evaluate(() => {
    const node = window.__state.nodes.get('node-a');
    return { x: node.x, y: node.y };
  });

  // Move node-a
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
  await page.mouse.move(cx + 60, cy + 30, { steps: 10 });
  await page.mouse.up();

  // Verify moved
  const moved = await page.evaluate(() => {
    const node = window.__state.nodes.get('node-a');
    return { x: node.x, y: node.y };
  });
  expect(moved.x).not.toBeCloseTo(before.x, 0);

  // Focus workspace and undo via keyboard
  await page.evaluate(() => window.__workspace.focus());
  await page.keyboard.press('Control+z');

  const undone = await page.evaluate(() => {
    const node = window.__state.nodes.get('node-a');
    return { x: node.x, y: node.y };
  });
  expect(undone.x).toBeCloseTo(before.x, 0);
  expect(undone.y).toBeCloseTo(before.y, 0);
});

test('Ctrl+Shift+Z redoes undone operation', async ({ page }) => {
  const before = await page.evaluate(() => {
    const node = window.__state.nodes.get('node-a');
    return { x: node.x, y: node.y };
  });

  // Move node-a
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
  await page.mouse.move(cx + 60, cy + 30, { steps: 10 });
  await page.mouse.up();

  const moved = await page.evaluate(() => {
    const node = window.__state.nodes.get('node-a');
    return { x: node.x, y: node.y };
  });

  // Undo
  await page.evaluate(() => window.__workspace.focus());
  await page.keyboard.press('Control+z');

  // Redo
  await page.keyboard.press('Control+Shift+z');

  const redone = await page.evaluate(() => {
    const node = window.__state.nodes.get('node-a');
    return { x: node.x, y: node.y };
  });
  expect(redone.x).toBeCloseTo(moved.x, 0);
  expect(redone.y).toBeCloseTo(moved.y, 0);
});

test('Delete key removes selected node', async ({ page }) => {
  // Select node-a
  await page.evaluate(() => window.__state.selectNode('node-a'));

  await page.evaluate(() => window.__workspace.focus());
  await page.keyboard.press('Delete');

  const exists = await page.evaluate(() => window.__state.nodes.has('node-a'));
  expect(exists).toBe(false);
});

test('undo restores deleted node', async ({ page }) => {
  await page.evaluate(() => window.__state.selectNode('node-a'));

  await page.evaluate(() => window.__workspace.focus());
  await page.keyboard.press('Delete');

  // Undo
  await page.keyboard.press('Control+z');

  const exists = await page.evaluate(() => window.__state.nodes.has('node-a'));
  expect(exists).toBe(true);
});
