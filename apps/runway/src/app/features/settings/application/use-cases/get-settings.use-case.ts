import { Injectable, inject } from '@angular/core';
import { SETTINGS_REPOSITORY, type SettingsView } from '../ports/settings.repository';

/**
 * Live query — returns the reactive settings view. Deliberately not the async
 * `UseCase` contract: settings are live preference signals, so callers consume a
 * reactive view, not a one-shot Promise.
 */
@Injectable({ providedIn: 'root' })
export class GetSettingsUseCase {
  readonly #repo = inject(SETTINGS_REPOSITORY);
  execute(): SettingsView {
    return this.#repo.view();
  }
}
