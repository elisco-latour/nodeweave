import { test, expect } from '@playwright/test';

const FIXTURE = '/tests/perf/fixtures/perf-fixture.html';

async function waitForReady(page) {
  await page.goto(FIXTURE);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 15000 });
}

test.describe('Performance: 500 nodes', () => {
  test('initial render < 5000ms', async ({ page }) => {
    await waitForReady(page);

    const renderTime = await page.evaluate(() => {
      const start = performance.now();
      window.__addNodesGrid(500);
      return performance.now() - start;
    });

    console.log(`500-node initial render: ${renderTime.toFixed(1)}ms`);
    expect(renderTime).toBeLessThan(5000);
  });

  test('pan maintains > 20fps with virtualization', async ({ page }) => {
    await waitForReady(page);
    await page.evaluate(() => window.__addNodesGrid(500));
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

    console.log(`500-node pan FPS: ${fps.toFixed(1)}`);
    expect(fps).toBeGreaterThan(20);
  });

  test('add 1 node < 200ms', async ({ page }) => {
    await waitForReady(page);
    await page.evaluate(() => window.__addNodesGrid(500));
    await page.evaluate(() => new Promise(r => requestAnimationFrame(r)));

    const addTime = await page.evaluate(() => {
      const start = performance.now();
      window.__addOneNode();
      return performance.now() - start;
    });

    console.log(`500-node add-one: ${addTime.toFixed(1)}ms`);
    expect(addTime).toBeLessThan(200);
  });
});
