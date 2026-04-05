/**
 * @typedef {{ color: string, label: string, icon?: string }} VisualDefinition
 */
/** @extends {Registry<VisualDefinition>} */
export class VisualRegistry extends Registry<VisualDefinition> {
    constructor();
}
export type VisualDefinition = {
    color: string;
    label: string;
    icon?: string;
};
import { Registry } from '../core/registry.js';
