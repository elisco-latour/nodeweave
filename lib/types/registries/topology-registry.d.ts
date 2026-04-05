/**
 * @typedef {{ inputs: number, outputs: number }} TopologyDefinition
 */
/** @extends {Registry<TopologyDefinition>} */
export class TopologyRegistry extends Registry<TopologyDefinition> {
    constructor();
}
export type TopologyDefinition = {
    inputs: number;
    outputs: number;
};
import { Registry } from '../core/registry.js';
