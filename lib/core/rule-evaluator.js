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
  static evaluate(rule, state) {
    if (rule.$and !== undefined) {
      return rule.$and.every(sub => RuleEvaluator.evaluate(sub, state));
    }
    if (rule.$or !== undefined) {
      return rule.$or.some(sub => RuleEvaluator.evaluate(sub, state));
    }
    if (rule.field === undefined || rule.operator === undefined) {
      throw new Error('Invalid rule: must have "$and", "$or", or "field"/"operator" keys.');
    }
    const fieldValue = state[rule.field];
    switch (rule.operator) {
      case 'equals':
        return fieldValue === rule.value;
      case 'notEquals':
        return fieldValue !== rule.value;
      case 'in':
        return rule.value.includes(fieldValue);
      case 'notIn':
        return !rule.value.includes(fieldValue);
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
      case 'notExists':
        return fieldValue === undefined || fieldValue === null || fieldValue === '';
      default:
        throw new Error(`Unknown operator: "${rule.operator}".`);
    }
  }
}
