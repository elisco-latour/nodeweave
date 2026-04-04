import { test, expect } from '@playwright/test';

const FIXTURE = '/tests/perf/fixtures/perf-fixture.html';

async function waitForReady(page) {
  await page.goto(FIXTURE);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 15000 });
}

test.describe('Performance: 1000 nodes', () => {
  test('initial render < 10000ms', async ({ page }) => {
    await waitForReady(page);

    const renderTime = await page.evaluate(() => {
      const start = performance.now();
      window.__addNodesGrid(1000);
      return performance.now() - start;
    });

    console.log(`1000-node initial render: ${renderTime.toFixed(1)}ms`);
    expect(renderTime).toBeLessThan(10000);
  });

  test('pan maintains > 15fps with virtualization', async ({ page }) => {
    await waitForReady(page);
    await page.evaluate(() => window.__addNodesGrid(1000));
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

    console.log(`1000-node pan FPS: ${fps.toFixed(1)}`);
    expect(fps).toBeGreaterThan(15);
  });

  test('virtualization culls at least 80% of nodes when zoomed in', async ({ page }) => {
    await waitForReady(page);
    await page.evaluate(() => window.__addNodesGrid(1000));
    await page.evaluate(() => new Promise(r => requestAnimationFrame(r)));

    // Zoom in to show only a small area
    const cullPercentage = await page.evaluate(() => {
      const state = window.__state;
      // Zoom in significantly — only a small portion visible
      state.setViewport(0, 0, 3);
      // Wait one frame for culling to apply
      return new Promise((resolve) => {
        requestAnimationFrame(() => {
          const ws = window.__workspace;
          const allNodes = ws.shadowRoot.querySelectorAll('canvas-node');
          let hiddenCount = 0;
          for (const el of allNodes) {
            if (el.style.display === 'none') hiddenCount++;
          }
          resolve(hiddenCount / allNodes.length);
        });
      });
    });

    console.log(`1000-node cull percentage: ${(cullPercentage * 100).toFixed(1)}%`);
    expect(cullPercentage).toBeGreaterThan(0.8);
  });
});
