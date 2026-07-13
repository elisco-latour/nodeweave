import { Injectable, inject } from '@angular/core';
import { SETTINGS_REPOSITORY } from '../ports/settings.repository';

/** Command — set the event-log retention window (days). Infallible. */
@Injectable({ providedIn: 'root' })
export class SetRetentionUseCase {
  readonly #repo = inject(SETTINGS_REPOSITORY);
  execute(days: number): void {
    this.#repo.setRetentionDays(days);
  }
}
