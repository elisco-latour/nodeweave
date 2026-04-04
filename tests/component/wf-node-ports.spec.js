import { test, expect } from '@playwright/test';

test.describe('wf-node port interface contracts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tests/component/fixtures/wf-node-ports-fixture.html');
    await page.waitForFunction(() => window.__ready === true);
  });

  test('port dots expose .portId, .direction, .nodeId and data-port attribute', async ({ page }) => {
    const result = await page.evaluate(() => {
      const node = document.createElement('wf-node');
      node.nodeId = 'n1';
      node.nodeType = 'action';
      node.ports = [
        { id: 'p-in-1', label: 'Input', direction: 'in', dataType: 'string' },
        { id: 'p-out-1', label: 'Output', direction: 'out', dataType: 'number' },
      ];
      document.body.appendChild(node);

      const dots = node.shadowRoot.querySelectorAll('[data-port]');
      return Array.from(dots).map(dot => ({
        portId: dot.portId,
        direction: dot.direction,
        nodeId: dot.nodeId,
        dataPortAttr: dot.getAttribute('data-port'),
      }));
    });

    expect(result).toHaveLength(2);

    const inPort = result.find(p => p.direction === 'in');
    expect(inPort).toBeDefined();
    expect(inPort.portId).toBe('p-in-1');
    expect(inPort.direction).toBe('in');
    expect(inPort.nodeId).toBe('n1');
    expect(inPort.dataPortAttr).toBe('p-in-1');

    const outPort = result.find(p => p.direction === 'out');
    expect(outPort).toBeDefined();
    expect(outPort.portId).toBe('p-out-1');
    expect(outPort.direction).toBe('out');
    expect(outPort.nodeId).toBe('n1');
    expect(outPort.dataPortAttr).toBe('p-out-1');
  });

  test('controllers can find ports via [data-port] selector', async ({ page }) => {
    const count = await page.evaluate(() => {
      const node = document.createElement('wf-node');
      node.nodeId = 'n2';
      node.nodeType = 'trigger';
      node.ports = [
        { id: 'a', label: 'A', direction: 'in', dataType: 'any' },
        { id: 'b', label: 'B', direction: 'out', dataType: 'any' },
        { id: 'c', label: 'C', direction: 'out', dataType: 'boolean' },
      ];
      document.body.appendChild(node);
      return node.shadowRoot.querySelectorAll('[data-port]').length;
    });

    expect(count).toBe(3);
  });
});
