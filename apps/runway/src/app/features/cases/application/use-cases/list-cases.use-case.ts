import { Injectable, inject } from '@angular/core';
import type { UseCase } from '../../../../core/base/use-case.base';
import type { Case } from '../../domain/case.entity';
import { CASE_REPOSITORY } from '../ports/case.repository';

@Injectable({ providedIn: 'root' })
export class ListCasesUseCase implements UseCase<void, Case[]> {
  readonly #repo = inject(CASE_REPOSITORY);
  execute(): Promise<Case[]> {
    return this.#repo.list();
  }
}
