/**
 * Result<T, E> — Railway-Oriented Programming primitive.
 *
 * Use for FALLIBLE operations whose failure is a business case the caller must
 * handle. Infrastructure-only failures (network, 5xx) should throw and be lifted
 * to a `NetworkError` by `ViewModelBase.executeWithResult`.
 *
 * See docs/ENTERPRISE_ANGULAR_ARCHITECTURE.md and the `angular-feature` skill.
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const fail = <E>(error: E): Result<never, E> => ({ ok: false, error });

export const isOk = <T, E>(r: Result<T, E>): r is { ok: true; value: T } => r.ok;
export const isFail = <T, E>(r: Result<T, E>): r is { ok: false; error: E } => !r.ok;

export const match = <T, E, U>(r: Result<T, E>, onOk: (v: T) => U, onFail: (e: E) => U): U =>
  r.ok ? onOk(r.value) : onFail(r.error);

/** The lifted form of a thrown infrastructure failure. */
export interface NetworkError {
  readonly kind: 'Network';
  readonly message: string;
}
