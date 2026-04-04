import { test, expect } from '@playwright/test';

const FIXTURE = '/tests/perf/fixtures/perf-fixture.html';

async function waitForReady(page) {
  await page.goto(FIXTURE);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 15000 });
}

test.describe('Performance: 200 nodes', () => {
  test('initial render < 2000ms', async ({ page }) => {
    await waitForReady(page);

    const renderTime = await page.evaluate(() => {
      const start = performance.now();
      window.__addNodesGrid(200);
      return performance.now() - start;
    });

    console.log(`200-node initial render: ${renderTime.toFixed(1)}ms`);
    expect(renderTime).toBeLessThan(2000);
  });

  test('pan maintains > 30fps', async ({ page }) => {
    await waitForReady(page);
    await page.evaluate(() => window.__addNodesGrid(200));

    // Wait a frame for rendering to settle
    await page.evaluate(() => new Promise(r => requestAnimationFrame(r)));

    const fps = await page.evaluate(() => {
      return new Promise((resolve) => {
        const state = window.__state;
        const frames = [];
        let count = 0;

        function panStep() {
          const now = performance.now();
          frames.push(now);
          count++;
          const { panX, panY, zoom } = state.viewport;
          state.setViewport(panX - 5, panY - 2, zoom);

          if (count < 60) {
            requestAnimationFrame(panStep);
          } else {
            // Calculate FPS from frame timestamps
            const durations = [];
            for (let i = 1; i < frames.length; i++) {
              durations.push(frames[i] - frames[i - 1]);
            }
            const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
            resolve(1000 / avgDuration);
          }
        }
        requestAnimationFrame(panStep);
      });
    });

    console.log(`200-node pan FPS: ${fps.toFixed(1)}`);
    expect(fps).toBeGreaterThan(30);
  });

  test('add 1 node < 100ms', async ({ page }) => {
    await waitForReady(page);
    await page.evaluate(() => window.__addNodesGrid(200));
    await page.evaluate(() => new Promise(r => requestAnimationFrame(r)));

    const addTime = await page.evaluate(() => {
      const start = performance.now();
      window.__addOneNode();
      return performance.now() - start;
    });

    console.log(`200-node add-one: ${addTime.toFixed(1)}ms`);
    expect(addTime).toBeLessThan(100);
  });
});
