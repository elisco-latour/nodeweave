import { InjectionToken } from '@angular/core';
import type { Result } from '../../../../shared/kernel/result';
import type { Action } from '../../domain/action.entity';
import type { ResolveActionError, DismissActionError } from '../../domain/errors/action.errors';

/**
 * Port for the Action Inbox. `list`/`getById` are infallible reads (they throw
 * only on infrastructure failure); `resolve`/`dismiss` return a `Result` because
 * "already closed" / "not found" are business outcomes the caller must handle.
 */
export interface IActionRepository {
  list(): Promise<Action[]>;
  getById(id: string): Promise<Action | null>;
  resolve(id: string): Promise<Result<Action, ResolveActionError>>;
  dismiss(id: string): Promise<Result<Action, DismissActionError>>;
}

export const ACTION_REPOSITORY = new InjectionToken<IActionRepository>('IActionRepository');
