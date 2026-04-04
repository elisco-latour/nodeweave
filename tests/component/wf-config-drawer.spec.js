import { test, expect } from '@playwright/test';

const TEST_SCHEMA = {
  fields: {
    url: {
      type: 'string',
      label: 'Endpoint URL',
      default: 'https://api.example.com/data',
    },
    method: {
      type: 'select',
      label: 'Method',
      options: ['GET', 'POST', 'PUT', 'DELETE'],
      default: 'GET',
    },
    body: {
      type: 'textarea',
      label: 'Request Body',
      rows: 4,
      showIf: { field: 'method', operator: 'in', value: ['POST', 'PUT'] },
    },
    timeout: {
      type: 'number',
      label: 'Timeout (ms)',
      default: 5000,
    },
  },
};

const ARRAY_SCHEMA = {
  fields: [
    { id: 'value', type: 'number', label: 'Value', default: 45 },
    { id: 'min', type: 'number', label: 'Min', default: 0 },
    { id: 'max', type: 'number', label: 'Max', default: 100 },
  ],
};

test.describe('wf-config-drawer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/component/fixtures/wf-ui-fixture.html');
    await page.waitForFunction(() => window.__ready === true);
  });

  test('renders form fields from object-style schema', async ({ page }) => {
    await page.evaluate((schema) => {
      const drawer = document.createElement('wf-config-drawer');
      document.body.appendChild(drawer);
      drawer.renderForm(schema, {});
      drawer.setAttribute('open', '');
    }, TEST_SCHEMA);

    const drawer = page.locator('wf-config-drawer');
    await expect(drawer).toHaveAttribute('open', '');

    const fieldCount = await drawer.evaluate((el) =>
      el.shadowRoot.querySelectorAll('.form-group').length,
    );
    expect(fieldCount).toBe(4);
  });

  test('renders form fields from array-style schema', async ({ page }) => {
    await page.evaluate((schema) => {
      const drawer = document.createElement('wf-config-drawer');
      document.body.appendChild(drawer);
      drawer.renderForm(schema, {});
      drawer.setAttribute('open', '');
    }, ARRAY_SCHEMA);

    const drawer = page.locator('wf-config-drawer');

    const fieldCount = await drawer.evaluate((el) =>
      el.shadowRoot.querySelectorAll('.form-group').length,
    );
    expect(fieldCount).toBe(3);
  });

  test('dispatches node-config-updated on input change', async ({ page }) => {
    const eventDetail = await page.evaluate((schema) => {
      return new Promise((resolve) => {
        const drawer = document.createElement('wf-config-drawer');
        document.body.appendChild(drawer);
        drawer.open('node-1', 'http_request', { _schema: schema });

        drawer.addEventListener('node-config-updated', (e) => {
          resolve(e.detail);
        });

        const input = drawer.shadowRoot.querySelector('#field-url');
        input.value = 'https://changed.example.com';
        input.dispatchEvent(new Event('input'));
      });
    }, TEST_SCHEMA);

    expect(eventDetail.nodeId).toBe('node-1');
    expect(eventDetail.config.url).toBe('https://changed.example.com');
  });

  test('showIf hides body when method is GET', async ({ page }) => {
    await page.evaluate((schema) => {
      const drawer = document.createElement('wf-config-drawer');
      document.body.appendChild(drawer);
      drawer.renderForm(schema, {});
      drawer.setAttribute('open', '');
    }, TEST_SCHEMA);

    const drawer = page.locator('wf-config-drawer');

    const bodyHidden = await drawer.evaluate((el) => {
      const group = el.shadowRoot.querySelector('[data-field-key="body"]');
      return group.hasAttribute('hidden');
    });
    expect(bodyHidden).toBe(true);
  });

  test('showIf reveals body when method changes to POST', async ({ page }) => {
    await page.evaluate((schema) => {
      const drawer = document.createElement('wf-config-drawer');
      document.body.appendChild(drawer);
      drawer.renderForm(schema, {});
      drawer.setAttribute('open', '');
    }, TEST_SCHEMA);

    const drawer = page.locator('wf-config-drawer');

    await drawer.evaluate((el) => {
      const select = el.shadowRoot.querySelector('#field-method');
      select.value = 'POST';
      select.dispatchEvent(new Event('change'));
    });

    const bodyVisible = await drawer.evaluate((el) => {
      const group = el.shadowRoot.querySelector('[data-field-key="body"]');
      return !group.hasAttribute('hidden');
    });
    expect(bodyVisible).toBe(true);
  });

  test('close removes open attribute', async ({ page }) => {
    await page.evaluate((schema) => {
      const drawer = document.createElement('wf-config-drawer');
      document.body.appendChild(drawer);
      drawer.open('n1', 'test', { _schema: schema });
    }, TEST_SCHEMA);

    const drawer = page.locator('wf-config-drawer');
    await expect(drawer).toHaveAttribute('open', '');

    await drawer.evaluate((el) => {
      el.shadowRoot.getElementById('close-btn').click();
    });

    await expect(drawer).not.toHaveAttribute('open');
  });
});
