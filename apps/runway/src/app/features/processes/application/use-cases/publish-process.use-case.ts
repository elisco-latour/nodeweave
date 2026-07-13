import { Injectable, inject } from '@angular/core';
import type { UseCase } from '../../../../core/base/use-case.base';
import type { Result } from '../../../../shared/kernel/result';
import type { Process } from '../../domain/process.entity';
import type { PublishProcessError } from '../../domain/errors/process.errors';
import { PROCESS_REPOSITORY, type PublishProcessInput } from '../ports/process.repository';

@Injectable({ providedIn: 'root' })
export class PublishProcessUseCase
  implements UseCase<PublishProcessInput, Result<Process, PublishProcessError>> {
  readonly #repo = inject(PROCESS_REPOSITORY);
  execute(input: PublishProcessInput): Promise<Result<Process, PublishProcessError>> {
    return this.#repo.publish(input);
  }
}
