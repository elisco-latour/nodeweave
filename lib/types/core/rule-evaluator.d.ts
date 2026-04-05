/**
 * @typedef {{ field: string, operator: 'equals'|'notEquals'|'in'|'notIn'|'exists'|'notExists', value?: * }} FieldRule
 * @typedef {{ $and: Rule[] }} AndRule
 * @typedef {{ $or: Rule[] }} OrRule
 * @typedef {FieldRule | AndRule | OrRule} Rule
 */
export class RuleEvaluator {
    /**
     * @param {Rule} rule
     * @param {Record<string, *>} state
     * @returns {boolean}
     */
    static evaluate(rule: Rule, state: Record<string, any>): boolean;
}
export type FieldRule = {
    field: string;
    operator: "equals" | "notEquals" | "in" | "notIn" | "exists" | "notExists";
    value?: any;
};
export type AndRule = {
    $and: Rule[];
};
export type OrRule = {
    $or: Rule[];
};
export type Rule = FieldRule | AndRule | OrRule;
