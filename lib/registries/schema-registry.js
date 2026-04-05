import { Registry } from '../core/registry.js';

/**
 * @typedef {import('../core/rule-evaluator.js').Rule} Rule
 */

/**
 * @typedef {{ type: 'string'|'number'|'select'|'textarea'|'boolean'|'list', label: string, default?: *, options?: string[], showIf?: Rule }} SchemaField
 */

/**
 * @typedef {{ fields: Record<string, SchemaField> }} SchemaDefinition
 */

/** @extends {Registry<SchemaDefinition>} */
export class SchemaRegistry extends Registry {
  constructor() {
    super('SchemaRegistry');
  }
}
