import { test, expect } from '@playwright/test';

const APP_URL = '/examples/vanilla/index.html';

async function waitForApp(page) {
  await page.goto(APP_URL);
  await page.waitForFunction(() => {
    const shell = document.querySelector('app-shell');
    if (!shell || !shell.shadowRoot) return false;
    const ws = shell.shadowRoot.getElementById('workspace');
    return ws && ws.state;
  }, null, { timeout: 10000 });
  // Expose Edge class
  await page.evaluate(() => {
    import('/packages/core/dist/core/graph.js').then(m => { window.__libExports = m; });
  });
  await page.waitForFunction(() => window.__libExports && window.__libExports.Edge);
}

async function addNodeViaKeyboard(page, nodeType) {
  await page.evaluate((type) => {
    const shell = document.querySelector('app-shell');
    const palette = shell.shadowRoot.getElementById('palette');
    const item = palette.shadowRoot.querySelector(`[data-node-type="${type}"]`);
    item.focus();
    item.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  }, nodeType);
}

async function getNodeCount(page) {
  return page.evaluate(() => {
    const shell = document.querySelector('app-shell');
    return shell.shadowRoot.getElementById('workspace').state.nodes.size;
  });
}

async function getEdgeCount(page) {
  return page.evaluate(() => {
    const shell = document.querySelector('app-shell');
    return shell.shadowRoot.getElementById('workspace').state.edges.size;
  });
}

async function connectNodesByIndex(page, aIdx, bIdx) {
  await page.evaluate(({ aIdx, bIdx }) => {
    const shell = document.querySelector('app-shell');
    const state = shell.shadowRoot.getElementById('workspace').state;
    const nodes = [...state.nodes.values()];
    const outPort = [...nodes[aIdx].ports.values()].find(p => p.direction === 'out');
    const inPort = [...nodes[bIdx].ports.values()].find(p => p.direction === 'in');
    const { Edge } = window.__libExports;
    state.addEdge(new Edge({ id: `edge-${Date.now()}-${Math.random()}`, sourcePortId: outPort.id, targetPortId: inPort.id }));
  }, { aIdx, bIdx });
}

test.describe('Save/Load pipeline', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await waitForApp(page);
  });

  test('save, clear, load, and delete a pipeline', async ({ page }) => {
    // Step 1: Create a pipeline with 3 nodes and 2 edges
    await addNodeViaKeyboard(page, 'trigger');
    await addNodeViaKeyboard(page, 'action');
    await addNodeViaKeyboard(page, 'logic_gate');
    expect(await getNodeCount(page)).toBe(3);

    await connectNodesByIndex(page, 0, 1); // trigger → action
    await connectNodesByIndex(page, 1, 2); // action → logic_gate
    expect(await getEdgeCount(page)).toBe(2);

    // Step 2: Save as "test-pipeline"
    page.on('dialog', async dialog => {
      if (dialog.type() === 'prompt') {
        await dialog.accept('test-pipeline');
      } else if (dialog.type() === 'confirm') {
        await dialog.accept();
      }
    });

    await page.evaluate(() => {
      const shell = document.querySelector('app-shell');
      const processList = shell.shadowRoot.getElementById('process-list');
      const saveBtn = processList.shadowRoot.getElementById('btn-save');
      saveBtn.click();
    });

    // Verify it appears in the list
    const listCount = await page.evaluate(() => {
      const shell = document.querySelector('app-shell');
      const processList = shell.shadowRoot.getElementById('process-list');
      return processList.shadowRoot.querySelectorAll('.pipeline-item').length;
    });
    expect(listCount).toBe(1);

    // Step 3: Click "New Pipeline" — canvas clears
    await page.evaluate(() => {
      const shell = document.querySelector('app-shell');
      const processList = shell.shadowRoot.getElementById('process-list');
      processList.shadowRoot.getElementById('btn-new').click();
    });

    expect(await getNodeCount(page)).toBe(0);
    expect(await getEdgeCount(page)).toBe(0);

    // Step 4: Load "test-pipeline" — assert 3 nodes and 2 edges restored
    await page.evaluate(() => {
      const shell = document.querySelector('app-shell');
      const processList = shell.shadowRoot.getElementById('process-list');
      const loadBtn = processList.shadowRoot.querySelector('.pipeline-item button');
      loadBtn.click();
    });

    expect(await getNodeCount(page)).toBe(3);
    expect(await getEdgeCount(page)).toBe(2);

    // Step 5: Delete "test-pipeline" — assert removed from list
    await page.evaluate(() => {
      const shell = document.querySelector('app-shell');
      const processList = shell.shadowRoot.getElementById('process-list');
      const deleteBtn = processList.shadowRoot.querySelector('.pipeline-item .btn-delete');
      deleteBtn.click();
    });

    const listCountAfterDelete = await page.evaluate(() => {
      const shell = document.querySelector('app-shell');
      const processList = shell.shadowRoot.getElementById('process-list');
      return processList.shadowRoot.querySelectorAll('.pipeline-item').length;
    });
    expect(listCountAfterDelete).toBe(0);
  });
});
