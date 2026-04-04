import { test, expect } from '@playwright/test';

const FIXTURE = '/tests/e2e/fixtures/e2e-fixture.html';

test.beforeEach(async ({ page }) => {
  await page.goto(FIXTURE);
  await page.waitForFunction(() => window.__ready === true);
});

test('wheel event changes zoom', async ({ page }) => {
  const before = await page.evaluate(() => window.__state.viewport.zoom);

  const ws = page.locator('canvas-workspace');
  const box = await ws.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  await page.mouse.move(cx, cy);
  await page.mouse.wheel(0, -200);

  const after = await page.evaluate(() => window.__state.viewport.zoom);
  expect(after).toBeGreaterThan(before);
});

test('wheel zoom is clamped', async ({ page }) => {
  const ws = page.locator('canvas-workspace');
  const box = await ws.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  await page.mouse.move(cx, cy);

  // Zoom out heavily
  for (let i = 0; i < 20; i++) {
    await page.mouse.wheel(0, 500);
  }

  const zoomOut = await page.evaluate(() => window.__state.viewport.zoom);
  expect(zoomOut).toBeGreaterThanOrEqual(0.1);

  // Zoom in heavily
  for (let i = 0; i < 40; i++) {
    await page.mouse.wheel(0, -500);
  }

  const zoomIn = await page.evaluate(() => window.__state.viewport.zoom);
  expect(zoomIn).toBeLessThanOrEqual(3.0);
});

test('middle-click drag pans the canvas', async ({ page }) => {
  const before = await page.evaluate(() => ({
    panX: window.__state.viewport.panX,
    panY: window.__state.viewport.panY,
  }));

  const ws = page.locator('canvas-workspace');
  const box = await ws.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  await page.mouse.move(cx, cy);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(cx + 100, cy + 50, { steps: 5 });
  await page.mouse.up({ button: 'middle' });

  const after = await page.evaluate(() => ({
    panX: window.__state.viewport.panX,
    panY: window.__state.viewport.panY,
  }));

  expect(after.panX).not.toEqual(before.panX);
  expect(after.panY).not.toEqual(before.panY);
});
