import { Injectable, inject } from '@angular/core';
import { SETTINGS_REPOSITORY } from '../ports/settings.repository';

/**
 * Command — toggle whether personal data (PII) is revealed. Governed: revealing
 * is an authorization decision (audited by the runtime). Infallible.
 */
@Injectable({ providedIn: 'root' })
export class TogglePiiRevealUseCase {
  readonly #repo = inject(SETTINGS_REPOSITORY);
  execute(): void {
    this.#repo.togglePiiReveal();
  }
}
