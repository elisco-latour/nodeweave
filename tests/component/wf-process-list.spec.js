import { test, expect } from '@playwright/test';

test.describe('wf-process-list', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/component/fixtures/wf-ui-fixture.html');
    await page.waitForFunction(() => window.__ready === true);
    // Clear localStorage between tests
    await page.evaluate(() => localStorage.clear());
  });

  test('renders empty state when no pipelines saved', async ({ page }) => {
    await page.evaluate(async () => {
      const { StorageService } = await import('/examples/wireframe/services/storage-service.js');
      const processList = document.createElement('wf-process-list');
      document.body.appendChild(processList);
      processList.storageService = new StorageService();
    });

    const list = page.locator('wf-process-list');
    const emptyText = await list.evaluate((el) => {
      const empty = el.shadowRoot.querySelector('.empty');
      return empty ? empty.textContent : null;
    });
    expect(emptyText).toBe('No saved pipelines');
  });

  test('has correct ARIA role', async ({ page }) => {
    await page.evaluate(() => {
      const processList = document.createElement('wf-process-list');
      document.body.appendChild(processList);
    });

    const list = page.locator('wf-process-list');
    await expect(list).toHaveAttribute('role', 'region');
    await expect(list).toHaveAttribute('aria-label', 'Pipeline management');
  });

  test('renders pipeline names after save', async ({ page }) => {
    await page.evaluate(async () => {
      const { StorageService } = await import('/examples/wireframe/services/storage-service.js');
      const storage = new StorageService();
      storage.save('My Pipeline', { nodes: [], edges: [] });
      storage.save('Test Flow', { nodes: [], edges: [] });

      const processList = document.createElement('wf-process-list');
      document.body.appendChild(processList);
      processList.storageService = storage;
    });

    const list = page.locator('wf-process-list');

    const names = await list.evaluate((el) => {
      const items = el.shadowRoot.querySelectorAll('.pipeline-name');
      return Array.from(items).map(n => n.textContent);
    });
    expect(names).toContain('My Pipeline');
    expect(names).toContain('Test Flow');
  });

  test('delete removes pipeline from list', async ({ page }) => {
    await page.evaluate(async () => {
      const { StorageService } = await import('/examples/wireframe/services/storage-service.js');
      const storage = new StorageService();
      storage.save('ToDelete', { nodes: [], edges: [] });

      const processList = document.createElement('wf-process-list');
      document.body.appendChild(processList);
      processList.storageService = storage;
    });

    const list = page.locator('wf-process-list');

    // Verify it's there
    let count = await list.evaluate((el) =>
      el.shadowRoot.querySelectorAll('.pipeline-item').length,
    );
    expect(count).toBe(1);

    // Click delete
    await list.evaluate((el) => {
      const delBtn = el.shadowRoot.querySelector('.btn-delete');
      delBtn.click();
    });

    // Verify it's gone
    const emptyText = await list.evaluate((el) => {
      const empty = el.shadowRoot.querySelector('.empty');
      return empty ? empty.textContent : null;
    });
    expect(emptyText).toBe('No saved pipelines');
  });

  test('load button triggers state loadFromJSON', async ({ page }) => {
    const loaded = await page.evaluate(async () => {
      const { StorageService } = await import('/examples/wireframe/services/storage-service.js');
      const { CanvasState } = await import('/packages/core/dist/core.js');
      const storage = new StorageService();
      const state = new CanvasState();

      storage.save('LoadMe', { nodes: [], edges: [], savedAt: Date.now() });

      const processList = document.createElement('wf-process-list');
      document.body.appendChild(processList);
      processList.storageService = storage;
      processList.state = state;

      return new Promise((resolve) => {
        // loadFromJSON dispatches state-reset
        state.addEventListener('state-reset', () => resolve(true));

        const loadBtn = processList.shadowRoot.querySelector(
          'button[aria-label="Load pipeline LoadMe"]',
        );
        if (loadBtn) {
          loadBtn.click();
        } else {
          resolve(false);
        }
      });
    });

    expect(loaded).toBe(true);
  });

  test('has New and Save buttons', async ({ page }) => {
    await page.evaluate(() => {
      const processList = document.createElement('wf-process-list');
      document.body.appendChild(processList);
    });

    const list = page.locator('wf-process-list');

    const btnNew = await list.evaluate((el) =>
      el.shadowRoot.getElementById('btn-new') !== null,
    );
    const btnSave = await list.evaluate((el) =>
      el.shadowRoot.getElementById('btn-save') !== null,
    );
    expect(btnNew).toBe(true);
    expect(btnSave).toBe(true);
  });
});
