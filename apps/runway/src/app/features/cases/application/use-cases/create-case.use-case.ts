import { Injectable, inject } from '@angular/core';
import type { UseCase } from '../../../../core/base/use-case.base';
import type { Result } from '../../../../shared/kernel/result';
import type { Case } from '../../domain/case.entity';
import type { CreateCaseError } from '../../domain/errors/case.errors';
import { CASE_REPOSITORY, type CreateCaseInput } from '../ports/case.repository';

@Injectable({ providedIn: 'root' })
export class CreateCaseUseCase
  implements UseCase<CreateCaseInput, Result<Case, CreateCaseError>> {
  readonly #repo = inject(CASE_REPOSITORY);
  execute(input: CreateCaseInput): Promise<Result<Case, CreateCaseError>> {
    return this.#repo.create(input);
  }
}
