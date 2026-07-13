import { describe, it, expect } from 'vitest';
import { ok, fail, isOk, isFail, match, type Result } from './result';

describe('Result kernel (ROP)', () => {
  it('ok() carries the value and is recognised by isOk', () => {
    const r = ok(42);
    expect(isOk(r)).toBe(true);
    expect(isFail(r)).toBe(false);
    if (isOk(r)) expect(r.value).toBe(42);
  });

  it('fail() carries the error and is recognised by isFail', () => {
    const r = fail({ kind: 'Nope', message: 'no' });
    expect(isFail(r)).toBe(true);
    expect(isOk(r)).toBe(false);
    if (isFail(r)) expect(r.error.kind).toBe('Nope');
  });

  it('match() routes to the correct branch', () => {
    const okRes: Result<number, string> = ok(2);
    const failRes: Result<number, string> = fail('boom');
    expect(match(okRes, (v) => `v${v}`, (e) => `e${e}`)).toBe('v2');
    expect(match(failRes, (v) => `v${v}`, (e) => `e${e}`)).toBe('eboom');
  });
});
