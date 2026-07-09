import { test, expect } from '@playwright/test';

test.describe('wf-palette', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/component/fixtures/wf-ui-fixture.html');
    await page.waitForFunction(() => window.__ready === true);
  });

  test('renders items from visual registry', async ({ page }) => {
    await page.evaluate(async () => {
      const { WfVisualRegistry, registerWireframeNodes, WfTopologyRegistry, WfSchemaRegistry } =
        await import('/examples/wireframe/registries.js');
      const visual = new WfVisualRegistry();
      const topology = new WfTopologyRegistry();
      const schema = new WfSchemaRegistry();
      registerWireframeNodes(visual, topology, schema);

      const palette = document.createElement('wf-palette');
      document.body.appendChild(palette);
      palette.visualRegistry = visual;
    });

    const palette = page.locator('wf-palette');

    const itemCount = await palette.evaluate((el) =>
      el.shadowRoot.querySelectorAll('.palette-item').length,
    );
    // registries.js registers 3 node types: range_input, http_request, data_mapper
    expect(itemCount).toBe(3);
  });

  test('items have correct labels', async ({ page }) => {
    await page.evaluate(async () => {
      const { WfVisualRegistry, registerWireframeNodes, WfTopologyRegistry, WfSchemaRegistry } =
        await import('/examples/wireframe/registries.js');
      const visual = new WfVisualRegistry();
      const topology = new WfTopologyRegistry();
      const schema = new WfSchemaRegistry();
      registerWireframeNodes(visual, topology, schema);

      const palette = document.createElement('wf-palette');
      document.body.appendChild(palette);
      palette.visualRegistry = visual;
    });

    const palette = page.locator('wf-palette');

    const labels = await palette.evaluate((el) => {
      const items = el.shadowRoot.querySelectorAll('.palette-item');
      return Array.from(items).map(item => item.textContent.trim());
    });
    expect(labels).toContain('Range Input');
    expect(labels).toContain('HTTP Request');
    expect(labels).toContain('Data Mapper');
  });

  test('has navigation role', async ({ page }) => {
    await page.evaluate(() => {
      const palette = document.createElement('wf-palette');
      document.body.appendChild(palette);
    });

    const palette = page.locator('wf-palette');
    await expect(palette).toHaveAttribute('role', 'navigation');
    await expect(palette).toHaveAttribute('aria-label', 'Node palette');
  });

  test('dispatches palette-add-node on Enter key', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const { WfVisualRegistry, registerWireframeNodes, WfTopologyRegistry, WfSchemaRegistry } =
        await import('/examples/wireframe/registries.js');
      const visual = new WfVisualRegistry();
      const topology = new WfTopologyRegistry();
      const schema = new WfSchemaRegistry();
      registerWireframeNodes(visual, topology, schema);

      const palette = document.createElement('wf-palette');
      document.body.appendChild(palette);
      palette.visualRegistry = visual;

      return new Promise((resolve) => {
        palette.addEventListener('palette-add-node', (e) => {
          resolve(e.detail);
        });

        const firstItem = palette.shadowRoot.querySelector('.palette-item');
        firstItem.focus();
        firstItem.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      });
    });

    expect(result.nodeType).toBe('range_input');
  });

  test('items are draggable', async ({ page }) => {
    await page.evaluate(async () => {
      const { WfVisualRegistry, registerWireframeNodes, WfTopologyRegistry, WfSchemaRegistry } =
        await import('/examples/wireframe/registries.js');
      const visual = new WfVisualRegistry();
      const topology = new WfTopologyRegistry();
      const schema = new WfSchemaRegistry();
      registerWireframeNodes(visual, topology, schema);

      const palette = document.createElement('wf-palette');
      document.body.appendChild(palette);
      palette.visualRegistry = visual;
    });

    const palette = page.locator('wf-palette');

    const allDraggable = await palette.evaluate((el) => {
      const items = el.shadowRoot.querySelectorAll('.palette-item');
      return Array.from(items).every(item => item.getAttribute('draggable') === 'true');
    });
    expect(allDraggable).toBe(true);
  });
});
