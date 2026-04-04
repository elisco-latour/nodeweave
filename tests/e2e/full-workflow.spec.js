import { test, expect } from '@playwright/test';

const APP_URL = '/app/index.html';

/** Wait for app-shell to be fully wired. */
async function waitForApp(page) {
  await page.goto(APP_URL);
  await page.waitForFunction(() => {
    const shell = document.querySelector('app-shell');
    if (!shell || !shell.shadowRoot) return false;
    const ws = shell.shadowRoot.getElementById('workspace');
    return ws && ws.state;
  }, null, { timeout: 10000 });
}

/** Add node by pressing Enter on palette item of given type. */
async function addNodeViaKeyboard(page, nodeType) {
  await page.evaluate((type) => {
    const shell = document.querySelector('app-shell');
    const palette = shell.shadowRoot.getElementById('palette');
    const item = palette.shadowRoot.querySelector(`[data-node-type="${type}"]`);
    item.focus();
    item.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  }, nodeType);
}

/** Get the number of nodes on the canvas. */
async function getNodeCount(page) {
  return page.evaluate(() => {
    const shell = document.querySelector('app-shell');
    const ws = shell.shadowRoot.getElementById('workspace');
    return ws.state.nodes.size;
  });
}

/** Get the number of edges on the canvas. */
async function getEdgeCount(page) {
  return page.evaluate(() => {
    const shell = document.querySelector('app-shell');
    const ws = shell.shadowRoot.getElementById('workspace');
    return ws.state.edges.size;
  });
}

/** Programmatically add an edge between first output port of node A and first input port of node B. */
async function connectNodes(page, nodeAIndex, nodeBIndex) {
  await page.evaluate(({ aIdx, bIdx }) => {
    const shell = document.querySelector('app-shell');
    const ws = shell.shadowRoot.getElementById('workspace');
    const state = ws.state;
    const nodes = [...state.nodes.values()];
    const nodeA = nodes[aIdx];
    const nodeB = nodes[bIdx];
    const outPort = [...nodeA.ports.values()].find(p => p.direction === 'out');
    const inPort = [...nodeB.ports.values()].find(p => p.direction === 'in');

    // Need access to Edge class
    const { Edge } = window.__libExports || {};
    if (Edge) {
      state.addEdge(new Edge({ id: `edge-${Date.now()}`, sourcePortId: outPort.id, targetPortId: inPort.id }));
    }
  }, { aIdx: nodeAIndex, bIdx: nodeBIndex });
}

/** Select a node by clicking on its canvas-node element. */
async function selectNodeByIndex(page, index) {
  await page.evaluate((idx) => {
    const shell = document.querySelector('app-shell');
    const ws = shell.shadowRoot.getElementById('workspace');
    const state = ws.state;
    const nodes = [...state.nodes.values()];
    state.selectNode(nodes[idx].id);
  }, index);
}

test.describe('Full workflow', () => {
  test.beforeEach(async ({ page }) => {
    await waitForApp(page);
    // Expose the Edge class for programmatic edge creation
    await page.evaluate(() => {
      import('/lib/core/graph.js').then(m => { window.__libExports = m; });
    });
    await page.waitForFunction(() => window.__libExports && window.__libExports.Edge);
  });

  test('complete workflow: add nodes, connect, edit config, undo/redo', async ({ page }) => {
    // Step 1: Add a trigger node
    await addNodeViaKeyboard(page, 'trigger');
    expect(await getNodeCount(page)).toBe(1);

    // Step 2: Add an action node
    await addNodeViaKeyboard(page, 'action');
    expect(await getNodeCount(page)).toBe(2);

    // Step 3: Connect them with an edge
    await connectNodes(page, 0, 1);
    expect(await getEdgeCount(page)).toBe(1);

    // Step 4: Select first node → config drawer opens
    await selectNodeByIndex(page, 0);
    const drawerOpen = await page.evaluate(() => {
      const shell = document.querySelector('app-shell');
      const drawer = shell.shadowRoot.getElementById('drawer');
      return drawer.hasAttribute('open');
    });
    expect(drawerOpen).toBe(true);

    // Step 5: Edit a config field (change the 'event' select from 'on_start' to 'on_schedule')
    await page.evaluate(() => {
      const shell = document.querySelector('app-shell');
      const drawer = shell.shadowRoot.getElementById('drawer');
      const select = drawer.shadowRoot.querySelector('#field-event');
      if (select) {
        select.value = 'on_schedule';
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Verify config change was persisted to state
    const configAfterEdit = await page.evaluate(() => {
      const shell = document.querySelector('app-shell');
      const ws = shell.shadowRoot.getElementById('workspace');
      const node = [...ws.state.nodes.values()][0];
      return node.metadata.config;
    });
    expect(configAfterEdit.event).toBe('on_schedule');

    // Step 6: Undo config edit — focus workspace first for keyboard shortcuts
    await page.evaluate(() => {
      const shell = document.querySelector('app-shell');
      shell.shadowRoot.getElementById('workspace').focus();
    });
    await page.keyboard.press('Control+z');
    const configAfterUndo = await page.evaluate(() => {
      const shell = document.querySelector('app-shell');
      const ws = shell.shadowRoot.getElementById('workspace');
      const node = [...ws.state.nodes.values()][0];
      return node.metadata.config;
    });
    expect(configAfterUndo.event).toBe('on_start');

    // Step 7: Ctrl+Z twice → edge removed, then second node removed
    await page.keyboard.press('Control+z');
    expect(await getEdgeCount(page)).toBe(0);

    await page.keyboard.press('Control+z');
    expect(await getNodeCount(page)).toBe(1);

    // Step 8: Redo all → fully restored
    await page.keyboard.press('Control+Shift+z');
    expect(await getNodeCount(page)).toBe(2);

    await page.keyboard.press('Control+Shift+z');
    expect(await getEdgeCount(page)).toBe(1);

    await page.keyboard.press('Control+Shift+z');
    const configAfterRedo = await page.evaluate(() => {
      const shell = document.querySelector('app-shell');
      const ws = shell.shadowRoot.getElementById('workspace');
      const node = [...ws.state.nodes.values()][0];
      return node.metadata.config;
    });
    expect(configAfterRedo.event).toBe('on_schedule');
  });
});
