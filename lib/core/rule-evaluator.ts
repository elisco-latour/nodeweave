import type { Rule, FieldRule, AndRule, OrRule } from '../types.js';

export type { Rule };

export class RuleEvaluator {
  static evaluate(rule: Rule, state: Record<string, unknown>): boolean {
    if ('$and' in rule) {
      return (rule as AndRule).$and.every(sub => RuleEvaluator.evaluate(sub, state));
    }
    if ('$or' in rule) {
      return (rule as OrRule).$or.some(sub => RuleEvaluator.evaluate(sub, state));
    }
    const fieldRule = rule as FieldRule;
    if (fieldRule.field === undefined || fieldRule.operator === undefined) {
      throw new Error('Invalid rule: must have "$and", "$or", or "field"/"operator" keys.');
    }
    const fieldValue = state[fieldRule.field];
    switch (fieldRule.operator) {
      case 'equals':    return fieldValue === fieldRule.value;
      case 'notEquals': return fieldValue !== fieldRule.value;
      case 'in':        return (fieldRule.value as unknown[]).includes(fieldValue);
      case 'notIn':     return !(fieldRule.value as unknown[]).includes(fieldValue);
      case 'exists':    return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
      case 'notExists': return fieldValue === undefined || fieldValue === null || fieldValue === '';
      default:
        throw new Error(`Unknown operator: "${fieldRule.operator}".`);
    }
  }
}
