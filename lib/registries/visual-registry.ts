import { Registry } from '../core/registry.js';
import type { VisualDefinition } from '../types.js';

export type { VisualDefinition };

export class VisualRegistry extends Registry<VisualDefinition> {
  constructor() {
    super('VisualRegistry');
  }
}
