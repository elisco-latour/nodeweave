import { Registry } from '../core/registry.js';
import type { TopologyDefinition } from '../types.js';

export type { TopologyDefinition };

export class TopologyRegistry extends Registry<TopologyDefinition> {
  constructor() {
    super('TopologyRegistry');
  }
}
