import { Injectable, inject } from '@angular/core';
import type { UseCase } from '../../../../core/base/use-case.base';
import type { Case } from '../../domain/case.entity';
import { CASE_REPOSITORY } from '../ports/case.repository';

@Injectable({ providedIn: 'root' })
export class GetCaseUseCase implements UseCase<string, Case | null> {
  readonly #repo = inject(CASE_REPOSITORY);
  execute(ref: string): Promise<Case | null> {
    return this.#repo.getByRef(ref);
  }
}
