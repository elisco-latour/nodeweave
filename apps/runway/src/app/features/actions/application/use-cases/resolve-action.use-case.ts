import { Injectable, inject } from '@angular/core';
import type { UseCase } from '../../../../core/base/use-case.base';
import type { Result } from '../../../../shared/kernel/result';
import type { Action } from '../../domain/action.entity';
import type { ResolveActionError } from '../../domain/errors/action.errors';
import { ACTION_REPOSITORY } from '../ports/action.repository';

@Injectable({ providedIn: 'root' })
export class ResolveActionUseCase implements UseCase<string, Result<Action, ResolveActionError>> {
  readonly #repo = inject(ACTION_REPOSITORY);
  execute(id: string): Promise<Result<Action, ResolveActionError>> {
    return this.#repo.resolve(id);
  }
}
