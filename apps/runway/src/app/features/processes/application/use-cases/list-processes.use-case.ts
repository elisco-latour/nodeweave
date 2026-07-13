import { Injectable, inject } from '@angular/core';
import type { UseCase } from '../../../../core/base/use-case.base';
import type { Process } from '../../domain/process.entity';
import { PROCESS_REPOSITORY } from '../ports/process.repository';

@Injectable({ providedIn: 'root' })
export class ListProcessesUseCase implements UseCase<void, Process[]> {
  readonly #repo = inject(PROCESS_REPOSITORY);
  execute(): Promise<Process[]> {
    return this.#repo.list();
  }
}
