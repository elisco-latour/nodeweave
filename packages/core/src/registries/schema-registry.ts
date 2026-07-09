import { Registry } from '../core/registry.js';
import type { SchemaDefinition } from '../types.js';

export type { SchemaDefinition, SchemaField } from '../types.js';

export class SchemaRegistry extends Registry<SchemaDefinition> {
  constructor() {
    super('SchemaRegistry');
  }
}
