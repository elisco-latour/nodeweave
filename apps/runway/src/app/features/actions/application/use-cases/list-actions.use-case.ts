import { Injectable, inject } from '@angular/core';
import type { UseCase } from '../../../../core/base/use-case.base';
import type { Action } from '../../domain/action.entity';
import { ACTION_REPOSITORY } from '../ports/action.repository';

@Injectable({ providedIn: 'root' })
export class ListActionsUseCase implements UseCase<void, Action[]> {
  readonly #repo = inject(ACTION_REPOSITORY);
  execute(): Promise<Action[]> {
    return this.#repo.list();
  }
}
