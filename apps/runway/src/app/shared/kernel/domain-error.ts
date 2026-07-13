/**
 * DomainError — thrown by rich domain entities when an invariant or an invalid
 * state transition is violated. Distinct from the discriminated-union error
 * *types* returned via `Result<T, E>` (those are expected business outcomes the
 * caller handles; a DomainError is a programming/guard violation).
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}
