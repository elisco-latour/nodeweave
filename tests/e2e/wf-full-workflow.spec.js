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
  // Expose Edge class for programmatic edge creation
  await page.evaluate(() => {
    import('/lib/core/graph.js').then(m => { window.__libExports = m; });
  });
  await page.waitForFunction(() => window.__libExports && window.__libExports.Edge);
}

async function getState(page) {
  return page.evaluate(() => window.__state);
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

async function selectNodeByIndex(page, index) {
  await page.evaluate((idx) => {
    const state = window.__state;
    const nodes = [...state.nodes.values()];
    state.selectNode(nodes[idx].id);
  }, index);
}

test.describe('Wireframe full workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { localStorage.clear(); });
    await waitForShell(page);
  });

  test('add nodes via palette, connect, open config, undo/redo', async ({ page }) => {
    // Step 1: Add a range_input node
    await addNodeViaPalette(page, 'range_input');
    expect(await getNodeCount(page)).toBe(1);

    // Step 2: Add an http_request node
    await addNodeViaPalette(page, 'http_request');
    expect(await getNodeCount(page)).toBe(2);

    // Step 3: Connect range_input → http_request
    await connectNodesByIndex(page, 0, 1);
    expect(await getEdgeCount(page)).toBe(1);

    // Step 4: Select first node → config drawer opens
    await selectNodeByIndex(page, 0);
    const drawerOpen = await page.evaluate(() => {
      const shell = document.querySelector('wf-shell');
      const drawer = shell.shadowRoot.getElementById('drawer');
      return drawer.hasAttribute('open');
    });
    expect(drawerOpen).toBe(true);

    // Step 5: Edit a config field (change 'value' number from 45 to 99)
    await page.evaluate(() => {
      const shell = document.querySelector('wf-shell');
      const drawer = shell.shadowRoot.getElementById('drawer');
      const input = drawer.shadowRoot.querySelector('#field-value');
      if (input) {
        input.value = '99';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // Verify config change persisted to state
    const configAfterEdit = await page.evaluate(() => {
      const state = window.__state;
      const node = [...state.nodes.values()][0];
      return node.metadata.config;
    });
    expect(configAfterEdit.value).toBe(99);

    // Step 6: Undo config edit
    await page.evaluate(() => {
      const shell = document.querySelector('wf-shell');
      shell.shadowRoot.getElementById('workspace').focus();
    });
    await page.keyboard.press('Control+z');
    const configAfterUndo = await page.evaluate(() => {
      const node = [...window.__state.nodes.values()][0];
      return node.metadata.config;
    });
    expect(configAfterUndo.value).toBe(45);

    // Step 7: Undo edge → node removal
    await page.keyboard.press('Control+z');
    expect(await getEdgeCount(page)).toBe(0);

    await page.keyboard.press('Control+z');
    expect(await getNodeCount(page)).toBe(1);

    // Step 8: Redo all back
    await page.keyboard.press('Control+Shift+z');
    expect(await getNodeCount(page)).toBe(2);

    await page.keyboard.press('Control+Shift+z');
    expect(await getEdgeCount(page)).toBe(1);

    await page.keyboard.press('Control+Shift+z');
    const configAfterRedo = await page.evaluate(() => {
      const node = [...window.__state.nodes.values()][0];
      return node.metadata.config;
    });
    expect(configAfterRedo.value).toBe(99);
  });

  test('context menu: duplicate and delete via ⋮ button', async ({ page }) => {
    await addNodeViaPalette(page, 'range_input');
    expect(await getNodeCount(page)).toBe(1);

    // Click the ⋮ menu button on the node
    await page.evaluate(() => {
      const shell = document.querySelector('wf-shell');
      const ws = shell.shadowRoot.getElementById('workspace');
      const node = ws.shadowRoot.querySelector('wf-node');
      const menuBtn = node.shadowRoot.querySelector('.menu-btn');
      menuBtn.click();
    });

    // Context menu should be visible
    const menuVisible = await page.evaluate(() => {
      const shell = document.querySelector('wf-shell');
      const menu = shell.shadowRoot.getElementById('context-menu');
      return !menu.hidden;
    });
    expect(menuVisible).toBe(true);

    // Click Duplicate
    await page.evaluate(() => {
      const shell = document.querySelector('wf-shell');
      shell.shadowRoot.getElementById('ctx-duplicate').click();
    });
    expect(await getNodeCount(page)).toBe(2);

    // Open context menu on second node and delete it
    await page.evaluate(() => {
      const shell = document.querySelector('wf-shell');
      const ws = shell.shadowRoot.getElementById('workspace');
      const nodes = ws.shadowRoot.querySelectorAll('wf-node');
      const menuBtn = nodes[1].shadowRoot.querySelector('.menu-btn');
      menuBtn.click();
    });

    await page.evaluate(() => {
      const shell = document.querySelector('wf-shell');
      shell.shadowRoot.getElementById('ctx-delete').click();
    });
    expect(await getNodeCount(page)).toBe(1);
  });
});
