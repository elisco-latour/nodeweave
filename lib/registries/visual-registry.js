import { Registry } from '../core/registry.js';

/**
 * @typedef {{ color: string, label: string, icon?: string }} VisualDefinition
 */

/** @extends {Registry<VisualDefinition>} */
export class VisualRegistry extends Registry {
  constructor() {
    super('VisualRegistry');
  }
}
