import { Registry } from '../core/registry.js';

/**
 * @typedef {{ inputs: number, outputs: number }} TopologyDefinition
 */

/** @extends {Registry<TopologyDefinition>} */
export class TopologyRegistry extends Registry {
  constructor() {
    super('TopologyRegistry');
  }
}
