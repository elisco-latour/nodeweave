import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RuleEvaluator } from "../dist/core/rule-evaluator.js";

// ─── Leaf operators ──────────────────────────────────────────────────────────

describe("RuleEvaluator — leaf operators", () => {
  it("equals — matching", () => {
    assert.equal(
      RuleEvaluator.evaluate(
        { field: "method", operator: "equals", value: "GET" },
        { method: "GET" },
      ),
      true,
    );
  });

  it("equals — non-matching", () => {
    assert.equal(
      RuleEvaluator.evaluate(
        { field: "method", operator: "equals", value: "GET" },
        { method: "POST" },
      ),
      false,
    );
  });

  it("notEquals — matching", () => {
    assert.equal(
      RuleEvaluator.evaluate(
        { field: "method", operator: "notEquals", value: "GET" },
        { method: "POST" },
      ),
      true,
    );
  });

  it("notEquals — non-matching", () => {
    assert.equal(
      RuleEvaluator.evaluate(
        { field: "method", operator: "notEquals", value: "GET" },
        { method: "GET" },
      ),
      false,
    );
  });

  it("in — matching", () => {
    assert.equal(
      RuleEvaluator.evaluate(
        { field: "method", operator: "in", value: ["POST", "PUT"] },
        { method: "POST" },
      ),
      true,
    );
  });

  it("in — non-matching", () => {
    assert.equal(
      RuleEvaluator.evaluate(
        { field: "method", operator: "in", value: ["POST", "PUT"] },
        { method: "GET" },
      ),
      false,
    );
  });

  it("notIn — matching", () => {
    assert.equal(
      RuleEvaluator.evaluate(
        { field: "method", operator: "notIn", value: ["POST", "PUT"] },
        { method: "GET" },
      ),
      true,
    );
  });

  it("notIn — non-matching", () => {
    assert.equal(
      RuleEvaluator.evaluate(
        { field: "method", operator: "notIn", value: ["POST", "PUT"] },
        { method: "POST" },
      ),
      false,
    );
  });

  it("exists — field present with value", () => {
    assert.equal(
      RuleEvaluator.evaluate(
        { field: "url", operator: "exists" },
        { url: "https://example.com" },
      ),
      true,
    );
  });

  it("exists — field undefined", () => {
    assert.equal(
      RuleEvaluator.evaluate({ field: "url", operator: "exists" }, {}),
      false,
    );
  });

  it("exists — field null", () => {
    assert.equal(
      RuleEvaluator.evaluate(
        { field: "url", operator: "exists" },
        { url: null },
      ),
      false,
    );
  });

  it("exists — field empty string", () => {
    assert.equal(
      RuleEvaluator.evaluate({ field: "url", operator: "exists" }, { url: "" }),
      false,
    );
  });

  it("notExists — field missing", () => {
    assert.equal(
      RuleEvaluator.evaluate({ field: "url", operator: "notExists" }, {}),
      true,
    );
  });

  it("notExists — field present", () => {
    assert.equal(
      RuleEvaluator.evaluate(
        { field: "url", operator: "notExists" },
        { url: "hello" },
      ),
      false,
    );
  });

  it("missing field in state treated as undefined", () => {
    assert.equal(
      RuleEvaluator.evaluate(
        { field: "missing", operator: "equals", value: undefined },
        {},
      ),
      true,
    );
    assert.equal(
      RuleEvaluator.evaluate(
        { field: "missing", operator: "equals", value: "x" },
        {},
      ),
      false,
    );
  });

  it("unknown operator throws", () => {
    assert.throws(
      () =>
        RuleEvaluator.evaluate(
          { field: "x", operator: "banana", value: 1 },
          {},
        ),
      { message: 'Unknown operator: "banana".' },
    );
  });
});

// ─── $and / $or ──────────────────────────────────────────────────────────────

describe("RuleEvaluator — $and / $or", () => {
  it("$and — all true", () => {
    const rule = {
      $and: [
        { field: "a", operator: "equals", value: 1 },
        { field: "b", operator: "equals", value: 2 },
      ],
    };
    assert.equal(RuleEvaluator.evaluate(rule, { a: 1, b: 2 }), true);
  });

  it("$and — one false", () => {
    const rule = {
      $and: [
        { field: "a", operator: "equals", value: 1 },
        { field: "b", operator: "equals", value: 999 },
      ],
    };
    assert.equal(RuleEvaluator.evaluate(rule, { a: 1, b: 2 }), false);
  });

  it("$or — all false", () => {
    const rule = {
      $or: [
        { field: "a", operator: "equals", value: 99 },
        { field: "b", operator: "equals", value: 99 },
      ],
    };
    assert.equal(RuleEvaluator.evaluate(rule, { a: 1, b: 2 }), false);
  });

  it("$or — one true", () => {
    const rule = {
      $or: [
        { field: "a", operator: "equals", value: 99 },
        { field: "b", operator: "equals", value: 2 },
      ],
    };
    assert.equal(RuleEvaluator.evaluate(rule, { a: 1, b: 2 }), true);
  });

  it("nested $and inside $or", () => {
    const rule = {
      $or: [
        {
          $and: [
            { field: "a", operator: "equals", value: 1 },
            { field: "b", operator: "equals", value: 2 },
          ],
        },
        { field: "c", operator: "equals", value: 99 },
      ],
    };
    assert.equal(RuleEvaluator.evaluate(rule, { a: 1, b: 2, c: 0 }), true);
  });

  it("nested $or inside $and", () => {
    const rule = {
      $and: [
        { field: "a", operator: "equals", value: 1 },
        {
          $or: [
            { field: "b", operator: "equals", value: 99 },
            { field: "c", operator: "equals", value: 3 },
          ],
        },
      ],
    };
    assert.equal(RuleEvaluator.evaluate(rule, { a: 1, b: 2, c: 3 }), true);
    assert.equal(RuleEvaluator.evaluate(rule, { a: 1, b: 2, c: 0 }), false);
  });

  it("empty $and returns true (vacuous truth)", () => {
    assert.equal(RuleEvaluator.evaluate({ $and: [] }, {}), true);
  });

  it("empty $or returns false", () => {
    assert.equal(RuleEvaluator.evaluate({ $or: [] }, {}), false);
  });
});

// ─── Invalid rules ───────────────────────────────────────────────────────────

describe("RuleEvaluator — invalid rules", () => {
  it("rule with no recognized keys throws", () => {
    assert.throws(() => RuleEvaluator.evaluate({ foo: "bar" }, {}), {
      message:
        'Invalid rule: must have "$and", "$or", or "field"/"operator" keys.',
    });
  });

  it("empty object throws", () => {
    assert.throws(() => RuleEvaluator.evaluate({}, {}), {
      message:
        'Invalid rule: must have "$and", "$or", or "field"/"operator" keys.',
    });
  });
});
