import { Injectable, inject } from '@angular/core';
import type { UseCase } from '../../../../core/base/use-case.base';
import type { Result } from '../../../../shared/kernel/result';
import type { Action } from '../../domain/action.entity';
import type { DismissActionError } from '../../domain/errors/action.errors';
import { ACTION_REPOSITORY } from '../ports/action.repository';

@Injectable({ providedIn: 'root' })
export class DismissActionUseCase implements UseCase<string, Result<Action, DismissActionError>> {
  readonly #repo = inject(ACTION_REPOSITORY);
  execute(id: string): Promise<Result<Action, DismissActionError>> {
    return this.#repo.dismiss(id);
  }
}
