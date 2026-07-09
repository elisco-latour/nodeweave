import { Registry } from '/packages/core/dist/core/registry.js';

// --- Visual ---

export class WfVisualRegistry extends Registry {
  constructor() { super('WfVisualRegistry'); }
}

// --- Topology ---

export class WfTopologyRegistry extends Registry {
  constructor() { super('WfTopologyRegistry'); }
}

// --- Schema ---

export class WfSchemaRegistry extends Registry {
  constructor() { super('WfSchemaRegistry'); }
}

/**
 * Register the wireframe-specific node types.
 * Each consumer defines its own set of node types.
 */
export function registerWireframeNodes(visual, topology, schema) {
  // --- range_input ---
  visual.register('range_input', {
    label: 'Range Input',
    color: '#0ea5e9',
    icon: 'fa-sliders',
  });
  topology.register('range_input', {
    inputs: [],
    outputs: [{ id: 'out', label: 'Number', position: 'right', dataType: 'number' }],
  });
  schema.register('range_input', {
    fields: [
      { id: 'value', type: 'number', label: 'Value', default: 45 },
      { id: 'min', type: 'number', label: 'Min', default: 0 },
      { id: 'max', type: 'number', label: 'Max', default: 100 },
    ],
  });

  // --- http_request ---
  visual.register('http_request', {
    label: 'HTTP Request',
    color: '#10b981',
    icon: 'fa-globe',
  });
  topology.register('http_request', {
    inputs: [{ id: 'in', label: 'Trigger', position: 'left', dataType: 'any' }],
    outputs: [{ id: 'out', label: 'JSON Payload', position: 'right', dataType: 'object' }],
  });
  schema.register('http_request', {
    fields: [
      { id: 'url', type: 'string', label: 'Endpoint URL', default: 'https://api.example.com/data' },
      { id: 'method', type: 'select', label: 'Method', default: 'GET', options: ['GET', 'POST', 'PUT', 'DELETE'] },
      { id: 'body', type: 'textarea', label: 'Request Body', default: '', rows: 4, placeholder: '{\"key\": \"value\"}', showIf: { field: 'method', operator: 'in', value: ['POST', 'PUT'] } },
    ],
  });

  // --- data_mapper ---
  visual.register('data_mapper', {
    label: 'Data Mapper',
    color: '#8b5cf6',
    icon: 'fa-layer-group',
  });
  topology.register('data_mapper', {
    inputs: [
      { id: 'source', label: 'Source Data', position: 'left', dataType: 'object' },
      { id: 'batch_size', label: 'Batch Size', position: 'left', dataType: 'number' },
      { id: 'strict', label: 'Strict Mode', position: 'left', dataType: 'boolean' },
      { id: 'fallback', label: 'Fallback Value', position: 'left', dataType: 'string' },
    ],
    outputs: [{ id: 'out', label: 'Mapped Object', position: 'right', dataType: 'object' }],
  });
  schema.register('data_mapper', {
    fields: [
      { id: 'mappingExpr', type: 'textarea', label: 'Mapping Expression', default: '' },
    ],
  });
}
