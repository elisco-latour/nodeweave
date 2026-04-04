import { test, expect } from '@playwright/test';

test.describe('wf-toolbar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/component/fixtures/wf-ui-fixture.html');
    await page.waitForFunction(() => window.__ready === true);
  });

  test('renders all 6 buttons', async ({ page }) => {
    await page.evaluate(() => {
      const toolbar = document.createElement('wf-toolbar');
      document.body.appendChild(toolbar);
    });

    const toolbar = page.locator('wf-toolbar');
    const buttonCount = await toolbar.evaluate((el) =>
      el.shadowRoot.querySelectorAll('button').length,
    );
    expect(buttonCount).toBe(6);
  });

  test('has correct ARIA role', async ({ page }) => {
    await page.evaluate(() => {
      const toolbar = document.createElement('wf-toolbar');
      document.body.appendChild(toolbar);
    });

    const toolbar = page.locator('wf-toolbar');
    await expect(toolbar).toHaveAttribute('role', 'toolbar');
    await expect(toolbar).toHaveAttribute('aria-label', 'Canvas tools');
  });

  test('undo/redo disabled without state', async ({ page }) => {
    await page.evaluate(() => {
      const toolbar = document.createElement('wf-toolbar');
      document.body.appendChild(toolbar);
    });

    const toolbar = page.locator('wf-toolbar');

    const undoDisabled = await toolbar.evaluate((el) =>
      el.shadowRoot.getElementById('btn-undo').disabled,
    );
    const redoDisabled = await toolbar.evaluate((el) =>
      el.shadowRoot.getElementById('btn-redo').disabled,
    );
    expect(undoDisabled).toBe(true);
    expect(redoDisabled).toBe(true);
  });

  test('undo enables after command execution on state', async ({ page }) => {
    const undoEnabled = await page.evaluate(async () => {
      const { CanvasState, Node } = await import('/lib/core.js');
      const state = new CanvasState();
      const toolbar = document.createElement('wf-toolbar');
      document.body.appendChild(toolbar);
      toolbar.state = state;

      // Initially disabled
      const beforeUndo = toolbar.shadowRoot.getElementById('btn-undo').disabled;

      // Execute a command
      state.addNode(new Node({ id: 'n1', type: 'test', x: 0, y: 0 }));

      // Wait a tick for event handlers
      await new Promise(r => setTimeout(r, 0));

      const afterUndo = toolbar.shadowRoot.getElementById('btn-undo').disabled;
      return { before: beforeUndo, after: afterUndo };
    });

    expect(undoEnabled.before).toBe(true);
    expect(undoEnabled.after).toBe(false);
  });

  test('redo enables after undo', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { CanvasState, Node } = await import('/lib/core.js');
      const state = new CanvasState();
      const toolbar = document.createElement('wf-toolbar');
      document.body.appendChild(toolbar);
      toolbar.state = state;

      state.addNode(new Node({ id: 'n1', type: 'test', x: 0, y: 0 }));
      await new Promise(r => setTimeout(r, 0));

      // Click undo
      toolbar.shadowRoot.getElementById('btn-undo').click();
      await new Promise(r => setTimeout(r, 0));

      return {
        undoDisabled: toolbar.shadowRoot.getElementById('btn-undo').disabled,
        redoDisabled: toolbar.shadowRoot.getElementById('btn-redo').disabled,
      };
    });

    expect(result.undoDisabled).toBe(true);
    expect(result.redoDisabled).toBe(false);
  });

  test('delete button dispatches toolbar-delete-selected', async ({ page }) => {
    const dispatched = await page.evaluate(() => {
      return new Promise((resolve) => {
        const toolbar = document.createElement('wf-toolbar');
        document.body.appendChild(toolbar);

        toolbar.addEventListener('toolbar-delete-selected', () => resolve(true));
        toolbar.shadowRoot.getElementById('btn-delete').click();
      });
    });

    expect(dispatched).toBe(true);
  });

  test('fit button dispatches toolbar-fit-view', async ({ page }) => {
    const dispatched = await page.evaluate(() => {
      return new Promise((resolve) => {
        const toolbar = document.createElement('wf-toolbar');
        document.body.appendChild(toolbar);

        toolbar.addEventListener('toolbar-fit-view', () => resolve(true));
        toolbar.shadowRoot.getElementById('btn-fit').click();
      });
    });

    expect(dispatched).toBe(true);
  });
});
