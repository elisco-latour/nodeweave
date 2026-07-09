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
  await page.evaluate(() => {
    import('/packages/core/dist/core/graph.js').then(m => { window.__libExports = m; });
  });
  await page.waitForFunction(() => window.__libExports && window.__libExports.Edge);
}

async function getNodeCount(page) {
  return page.evaluate(() => window.__state.nodes.size);
}

async function getEdgeCount(page) {
  return page.evaluate(() => window.__state.edges.size);
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

async function connectNodesByIndex(page, aIdx, bIdx) {
  await page.evaluate(({ aIdx, bIdx }) => {
    const state = window.__state;
    const nodes = [...state.nodes.values()];
    const outPort = [...nodes[aIdx].ports.values()].find(p => p.direction === 'out');
    const inPort = [...nodes[bIdx].ports.values()].find(p => p.direction === 'in');
    const { Edge } = window.__libExports;
    state.addEdge(new Edge({
      id: `edge-${Date.now()}-${Math.random()}`,
      sourcePortId: outPort.id,
      targetPortId: inPort.id,
    }));
  }, { aIdx, bIdx });
}

test.describe('Wireframe save/load pipeline', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { localStorage.clear(); });
    await waitForShell(page);
  });

  test('save, clear, load, and delete a pipeline', async ({ page }) => {
    // Step 1: Create pipeline with 2 nodes + 1 edge
    await addNodeViaPalette(page, 'range_input');
    await addNodeViaPalette(page, 'http_request');
    expect(await getNodeCount(page)).toBe(2);

    await connectNodesByIndex(page, 0, 1);
    expect(await getEdgeCount(page)).toBe(1);

    // Step 2: Save as "wf-test"
    page.on('dialog', async dialog => {
      if (dialog.type() === 'prompt') {
        await dialog.accept('wf-test');
      } else if (dialog.type() === 'confirm') {
        await dialog.accept();
      }
    });

    await page.evaluate(() => {
      const shell = document.querySelector('wf-shell');
      const processList = shell.shadowRoot.getElementById('process-list');
      processList.shadowRoot.getElementById('btn-save').click();
    });

    // Verify it appears in the list
    const listCount = await page.evaluate(() => {
      const shell = document.querySelector('wf-shell');
      const processList = shell.shadowRoot.getElementById('process-list');
      return processList.shadowRoot.querySelectorAll('.pipeline-item').length;
    });
    expect(listCount).toBe(1);

    // Step 3: New pipeline → canvas clears
    await page.evaluate(() => {
      const shell = document.querySelector('wf-shell');
      const processList = shell.shadowRoot.getElementById('process-list');
      processList.shadowRoot.getElementById('btn-new').click();
    });

    expect(await getNodeCount(page)).toBe(0);
    expect(await getEdgeCount(page)).toBe(0);

    // Step 4: Load "wf-test" — 2 nodes + 1 edge restored
    await page.evaluate(() => {
      const shell = document.querySelector('wf-shell');
      const processList = shell.shadowRoot.getElementById('process-list');
      const loadBtn = processList.shadowRoot.querySelector('.pipeline-item button');
      loadBtn.click();
    });

    expect(await getNodeCount(page)).toBe(2);
    expect(await getEdgeCount(page)).toBe(1);

    // Step 5: Delete "wf-test"
    await page.evaluate(() => {
      const shell = document.querySelector('wf-shell');
      const processList = shell.shadowRoot.getElementById('process-list');
      const deleteBtn = processList.shadowRoot.querySelector('.pipeline-item .btn-delete');
      deleteBtn.click();
    });

    const listCountAfterDelete = await page.evaluate(() => {
      const shell = document.querySelector('wf-shell');
      const processList = shell.shadowRoot.getElementById('process-list');
      return processList.shadowRoot.querySelectorAll('.pipeline-item').length;
    });
    expect(listCountAfterDelete).toBe(0);
  });
});
