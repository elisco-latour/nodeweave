import { test, expect } from '@playwright/test';

const WF_URL = '/tests/e2e/fixtures/wf-e2e-fixture.html';

async function waitForShell(page) {
  await page.goto(WF_URL);
  await page.waitForFunction(() => {
    const shell = document.querySelector('wf-shell');
    if (!shell || !shell.shadowRoot) return false;
    const ws = shell.shadowRoot.getElementById('workspace');
    return ws && ws.state;
  }, null, { timeout: 10000 });
}

async function addNodeViaPalette(page, nodeType) {
  await page.evaluate((type) => {
    const shell = document.querySelector('wf-shell');
    const palette = shell.shadowRoot.getElementById('palette');
    const item = palette.shadowRoot.querySelector(`[data-node-type="${type}"]`);
    if (!item) throw new Error(`Palette item for type "${type}" not found`);
    item.focus();
    item.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  }, nodeType);
}

function getMinimapLocator(page) {
  return page.locator('wf-shell').first()
    .locator('canvas-minimap');
}

test.describe('Minimap integration', () => {
  test('minimap is visible in bottom-left area', async ({ page }) => {
    await waitForShell(page);

    const minimap = getMinimapLocator(page);
    await expect(minimap).toBeVisible();

    const box = await minimap.boundingBox();
    expect(box).toBeTruthy();
    // Should be near the bottom-left
    expect(box.x).toBeLessThan(300);
    expect(box.y).toBeGreaterThan(200);
  });

  test('minimap canvas updates when nodes are added', async ({ page }) => {
    await waitForShell(page);

    const minimap = getMinimapLocator(page);
    await expect(minimap).toBeVisible();

    // Confirm no nodes initially
    const initialCount = await page.evaluate(() => window.__state.nodes.size);
    expect(initialCount).toBe(0);

    // Add nodes
    await addNodeViaPalette(page, 'range_input');
    await addNodeViaPalette(page, 'http_request');
    await page.waitForTimeout(200);

    expect(await page.evaluate(() => window.__state.nodes.size)).toBe(2);

    // After adding nodes, verify the minimap rendered by calling render explicitly
    // and checking for distinct colored pixels (not just viewport blue).
    const hasNodePixels = await page.evaluate(() => {
      const shell = document.querySelector('wf-shell');
      const mm = shell.shadowRoot.getElementById('minimap');
      // Force a render to ensure the canvas is up to date
      mm.render();
      const canvas = mm.shadowRoot.querySelector('canvas');
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      let found = 0;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2], a = d[i+3];
        if (a === 0) continue;
        // Look for greenish (http_request ~#10b981) or blueish node color (~#0ea5e9)
        // Exclude viewport indicator blue (rgba(77,171,247,...)) and edge gray (#666)
        const isGreen = g > 150 && b < 200 && r < 50; // range_input or http_request
        const isSkyBlue = r < 30 && g > 140 && b > 200; // range_input #0ea5e9
        if (isGreen || isSkyBlue) found++;
      }
      return found;
    });

    expect(hasNodePixels).toBeGreaterThan(0);
  });

  test('clicking minimap pans the workspace viewport', async ({ page }) => {
    await waitForShell(page);

    // Add nodes to give the minimap content to show
    await addNodeViaPalette(page, 'range_input');
    await addNodeViaPalette(page, 'http_request');
    await page.waitForTimeout(200);

    // Get initial viewport
    const viewportBefore = await page.evaluate(() => {
      return { ...window.__state.viewport };
    });

    const minimap = getMinimapLocator(page);
    const box = await minimap.boundingBox();

    // Click near a corner of the minimap
    await page.mouse.click(box.x + 10, box.y + 10);
    await page.waitForTimeout(200);

    // Viewport should have changed
    const viewportAfter = await page.evaluate(() => {
      return { ...window.__state.viewport };
    });

    const panChanged = viewportAfter.panX !== viewportBefore.panX ||
                       viewportAfter.panY !== viewportBefore.panY;
    expect(panChanged).toBe(true);
  });

  test('theme toggle updates minimap border', async ({ page }) => {
    await waitForShell(page);

    const minimap = getMinimapLocator(page);
    await expect(minimap).toBeVisible();

    // Get border color in light theme
    const lightBorder = await page.evaluate(() => {
      const shell = document.querySelector('wf-shell');
      const mm = shell.shadowRoot.getElementById('minimap');
      return getComputedStyle(mm).borderColor;
    });

    // Switch to dark theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.waitForTimeout(200);

    // Get border color in dark theme
    const darkBorder = await page.evaluate(() => {
      const shell = document.querySelector('wf-shell');
      const mm = shell.shadowRoot.getElementById('minimap');
      return getComputedStyle(mm).borderColor;
    });

    // Border color should differ between themes
    expect(darkBorder).not.toEqual(lightBorder);
  });
});
