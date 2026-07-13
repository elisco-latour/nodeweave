import { Injectable, inject } from '@angular/core';
import type { ThemePreference } from '../../domain/appearance';
import { SETTINGS_REPOSITORY } from '../ports/settings.repository';

/** Command — set the appearance (theme) preference. Infallible. */
@Injectable({ providedIn: 'root' })
export class SetAppearanceUseCase {
  readonly #repo = inject(SETTINGS_REPOSITORY);
  execute(pref: ThemePreference): void {
    this.#repo.setAppearance(pref);
  }
}
