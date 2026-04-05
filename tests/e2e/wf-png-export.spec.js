import { test, expect } from '@playwright/test';
import fs from 'fs';

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

test.describe('Wireframe PNG Export', () => {
  test('exports a PNG file when the export button is clicked', async ({ page }) => {
    await waitForShell(page);

    // Add a node so the canvas isn't empty
    await addNodeViaPalette(page, 'range_input');
    await page.waitForFunction(() => window.__state.nodes.size >= 1);

    // Set up download listener before clicking
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });

    // Click the PNG export button inside the toolbar's shadow DOM
    await page.evaluate(() => {
      const shell = document.querySelector('wf-shell');
      const toolbar = shell.shadowRoot.getElementById('toolbar');
      const btn = toolbar.shadowRoot.getElementById('btn-export-png');
      btn.click();
    });

    const download = await downloadPromise;

    // Accept either pipeline.png or pipeline.json (fallback if canvas is tainted)
    const filename = download.suggestedFilename();
    expect(filename).toBe('pipeline.png');

    // Save to temp and check file size > 0
    const path = await download.path();
    const stats = fs.statSync(path);
    expect(stats.size).toBeGreaterThan(0);
  });
});
