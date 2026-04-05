export class PipelineBuilder {
    /**
     * @param {string} id
     * @param {string} name
     * @param {number} [stage]
     * @returns {JobContext}
     */
    addJob(id: string, name: string, stage?: number): JobContext;
    /** @returns {CanvasState} */
    build(): CanvasState;
    #private;
}
declare class JobContext {
    /**
     * @param {PipelineBuilder} builder
     * @param {string} id
     */
    constructor(builder: PipelineBuilder, id: string);
    /** @returns {string} */
    get id(): string;
    /** @returns {string[]} */
    get parentIds(): string[];
    /**
     * @param {...string} parentIds
     * @returns {JobContext}
     */
    dependsOn(...parentIds: string[]): JobContext;
    /**
     * @param {string} id
     * @param {string} name
     * @param {number} [stage]
     * @returns {JobContext}
     */
    addJob(id: string, name: string, stage?: number): JobContext;
    /** @returns {CanvasState} */
    build(): CanvasState;
    #private;
}
import { CanvasState } from './canvas-state.js';
export {};
