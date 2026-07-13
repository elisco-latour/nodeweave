import { Injectable, inject } from '@angular/core';
import { ViewModelBase } from '../../../core/base/view-model.base';
import type { Pathway } from '../../../domain/model';
import type { ThemePreference } from '../domain/appearance';
import type { PathwayConfig } from '../domain/pathway-config';
import { GetSettingsUseCase } from '../application/use-cases/get-settings.use-case';
import { SetAppearanceUseCase } from '../application/use-cases/set-appearance.use-case';
import { TogglePiiRevealUseCase } from '../application/use-cases/toggle-pii-reveal.use-case';
import { SetRetentionUseCase } from '../application/use-cases/set-retention.use-case';
import { UpdatePathwayConfigUseCase } from '../application/use-cases/update-pathway-config.use-case';

/**
 * SettingsViewModel — MVVM state for the settings page. Exposes the live
 * settings view (reactive signals) and forwards each edit to its dedicated
 * command use case. Provided at the settings route.
 */
@Injectable()
export class SettingsViewModel extends ViewModelBase {
  readonly #getSettings = inject(GetSettingsUseCase);
  readonly #setAppearance = inject(SetAppearanceUseCase);
  readonly #togglePii = inject(TogglePiiRevealUseCase);
  readonly #setRetention = inject(SetRetentionUseCase);
  readonly #updateConfig = inject(UpdatePathwayConfigUseCase);

  readonly #view = this.#getSettings.execute();
  readonly appearance = this.#view.appearance;
  readonly piiRevealed = this.#view.piiRevealed;
  readonly retentionDays = this.#view.retentionDays;
  readonly pathwayConfig = this.#view.pathwayConfig;

  configFor(pathway: Pathway): PathwayConfig {
    return this.pathwayConfig()[pathway];
  }

  setAppearance(pref: ThemePreference): void {
    this.#setAppearance.execute(pref);
  }

  togglePii(): void {
    this.#togglePii.execute();
  }

  setRetention(days: number): void {
    this.#setRetention.execute(days);
  }

  updateConfig(pathway: Pathway, patch: Partial<PathwayConfig>): void {
    this.#updateConfig.execute({ pathway, patch });
  }
}
