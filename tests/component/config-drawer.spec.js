import { test, expect } from '@playwright/test';

const TEST_SCHEMA = {
  fields: {
    url: {
      type: 'string',
      label: 'Request URL',
      default: 'https://',
      placeholder: 'https://api.example.com/data',
    },
    method: {
      type: 'select',
      label: 'HTTP Method',
      options: ['GET', 'POST', 'PUT', 'DELETE'],
      default: 'GET',
    },
    body: {
      type: 'textarea',
      label: 'Request Body',
      rows: 6,
      showIf: { field: 'method', operator: 'in', value: ['POST', 'PUT'] },
    },
    timeout: {
      type: 'number',
      label: 'Timeout (ms)',
      default: 5000,
    },
  },
};

const LIST_SCHEMA = {
  fields: {
    headers: {
      type: 'list',
      label: 'Headers',
      itemSchema: {
        key: { type: 'string', label: 'Header Name' },
        value: { type: 'string', label: 'Header Value' },
      },
    },
  },
};

test.describe('config-drawer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/component/fixtures/config-drawer-fixture.html');
    await page.waitForFunction(() => window.__ready === true);
  });

  test('renders all 4 fields when opened with a schema', async ({ page }) => {
    await page.evaluate((schema) => {
      const drawer = document.querySelector('config-drawer');
      drawer.renderForm(schema, {});
      drawer.setAttribute('open', '');
    }, TEST_SCHEMA);

    const drawer = page.locator('config-drawer');
    await expect(drawer).toHaveAttribute('open', '');

    const fieldCount = await drawer.evaluate((el) =>
      el.shadowRoot.querySelectorAll('.form-group').length,
    );
    expect(fieldCount).toBe(4);
  });

  test('showIf: changing select reveals hidden field', async ({ page }) => {
    await page.evaluate((schema) => {
      const drawer = document.querySelector('config-drawer');
      drawer.renderForm(schema, {});
      drawer.setAttribute('open', '');
    }, TEST_SCHEMA);

    const drawer = page.locator('config-drawer');

    // Initially body field should be hidden (method defaults to GET)
    const bodyHidden = await drawer.evaluate((el) => {
      const group = el.shadowRoot.querySelector('[data-field-key="body"]');
      return group.hasAttribute('hidden');
    });
    expect(bodyHidden).toBe(true);

    // Change method to POST
    await drawer.evaluate((el) => {
      const select = el.shadowRoot.querySelector('#field-method');
      select.value = 'POST';
      select.dispatchEvent(new Event('change'));
    });

    // Body field should now be visible
    const bodyVisible = await drawer.evaluate((el) => {
      const group = el.shadowRoot.querySelector('[data-field-key="body"]');
      return !group.hasAttribute('hidden');
    });
    expect(bodyVisible).toBe(true);
  });

  test('showIf: hiding field retains data in emitted event', async ({ page }) => {
    await page.evaluate((schema) => {
      const drawer = document.querySelector('config-drawer');
      drawer.renderForm(schema, { method: 'POST', body: 'my body data' });
      drawer.setAttribute('open', '');
    }, TEST_SCHEMA);

    const drawer = page.locator('config-drawer');

    // Change method back to GET → hides body
    const eventConfig = await drawer.evaluate((el) => {
      return new Promise((resolve) => {
        el.addEventListener('node-config-updated', (e) => {
          resolve(e.detail.config);
        }, { once: true });
        const select = el.shadowRoot.querySelector('#field-method');
        select.value = 'GET';
        select.dispatchEvent(new Event('change'));
      });
    });

    // Body data should still be in the config
    expect(eventConfig.body).toBe('my body data');

    // Body field should be hidden
    const bodyHidden = await drawer.evaluate((el) => {
      const group = el.shadowRoot.querySelector('[data-field-key="body"]');
      return group.hasAttribute('hidden');
    });
    expect(bodyHidden).toBe(true);
  });

  test('typing into a text field fires node-config-updated', async ({ page }) => {
    await page.evaluate((schema) => {
      const drawer = document.querySelector('config-drawer');
      drawer.open('n1', 'http_request', { _schema: schema });
    }, TEST_SCHEMA);

    const drawer = page.locator('config-drawer');

    const eventDetail = await drawer.evaluate((el) => {
      return new Promise((resolve) => {
        el.addEventListener('node-config-updated', (e) => {
          resolve(e.detail);
        }, { once: true });
        const input = el.shadowRoot.querySelector('#field-url');
        input.value = 'https://test.com';
        input.dispatchEvent(new Event('input'));
      });
    });

    expect(eventDetail.nodeId).toBe('n1');
    expect(eventDetail.config.url).toBe('https://test.com');
  });

  test('opens with existing config values pre-populated', async ({ page }) => {
    const existingConfig = {
      url: 'https://existing.com',
      method: 'POST',
      body: 'existing body',
      timeout: 3000,
    };

    await page.evaluate(({ schema, config }) => {
      const drawer = document.querySelector('config-drawer');
      drawer.renderForm(schema, config);
      drawer.setAttribute('open', '');
    }, { schema: TEST_SCHEMA, config: existingConfig });

    const drawer = page.locator('config-drawer');

    const values = await drawer.evaluate((el) => {
      return {
        url: el.shadowRoot.querySelector('#field-url').value,
        method: el.shadowRoot.querySelector('#field-method').value,
        body: el.shadowRoot.querySelector('#field-body').value,
        timeout: el.shadowRoot.querySelector('#field-timeout').value,
      };
    });

    expect(values.url).toBe('https://existing.com');
    expect(values.method).toBe('POST');
    expect(values.body).toBe('existing body');
    expect(values.timeout).toBe('3000');
  });

  test('list field: add and remove items', async ({ page }) => {
    await page.evaluate((schema) => {
      const drawer = document.querySelector('config-drawer');
      drawer.renderForm(schema, {});
      drawer.setAttribute('open', '');
    }, LIST_SCHEMA);

    const drawer = page.locator('config-drawer');

    // Initially no list items
    const initialCount = await drawer.evaluate((el) =>
      el.shadowRoot.querySelectorAll('.list-item').length,
    );
    expect(initialCount).toBe(0);

    // Click "+ Add"
    await drawer.evaluate((el) => {
      el.shadowRoot.querySelector('.btn-add').click();
    });

    const afterAddCount = await drawer.evaluate((el) =>
      el.shadowRoot.querySelectorAll('.list-item').length,
    );
    expect(afterAddCount).toBe(1);

    // Click "Remove"
    await drawer.evaluate((el) => {
      el.shadowRoot.querySelector('.btn-remove').click();
    });

    const afterRemoveCount = await drawer.evaluate((el) =>
      el.shadowRoot.querySelectorAll('.list-item').length,
    );
    expect(afterRemoveCount).toBe(0);
  });

  test('ARIA attributes are present', async ({ page }) => {
    const drawer = page.locator('config-drawer');
    await expect(drawer).toHaveAttribute('role', 'complementary');
    await expect(drawer).toHaveAttribute('aria-label', 'Node configuration');
  });

  test('close button removes open attribute', async ({ page }) => {
    await page.evaluate((schema) => {
      const drawer = document.querySelector('config-drawer');
      drawer.open('n1', 'test', { _schema: schema });
    }, TEST_SCHEMA);

    const drawer = page.locator('config-drawer');
    await expect(drawer).toHaveAttribute('open', '');

    await drawer.evaluate((el) => {
      el.shadowRoot.querySelector('#close-btn').click();
    });

    await expect(drawer).not.toHaveAttribute('open');
  });
});
