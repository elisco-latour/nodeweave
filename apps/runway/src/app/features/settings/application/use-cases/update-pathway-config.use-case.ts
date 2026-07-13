import { Injectable, inject } from '@angular/core';
import { SETTINGS_REPOSITORY, type UpdatePathwayConfigInput } from '../ports/settings.repository';

/** Command — patch one pathway's process configuration. Infallible. */
@Injectable({ providedIn: 'root' })
export class UpdatePathwayConfigUseCase {
  readonly #repo = inject(SETTINGS_REPOSITORY);
  execute(input: UpdatePathwayConfigInput): void {
    this.#repo.updatePathwayConfig(input);
  }
}
