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
export class SchemaRegistry extends Registry<SchemaDefinition> {
    constructor();
}
export type Rule = import("../core/rule-evaluator.js").Rule;
export type SchemaField = {
    type: "string" | "number" | "select" | "textarea" | "boolean" | "list";
    label: string;
    default?: any;
    options?: string[];
    showIf?: Rule;
};
export type SchemaDefinition = {
    fields: Record<string, SchemaField>;
};
import { Registry } from '../core/registry.js';
