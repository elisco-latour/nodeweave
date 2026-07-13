import { InjectionToken, type Signal } from '@angular/core';
import type { Pathway } from '../../../../domain/model';
import type { ThemePreference } from '../../domain/appearance';
import type { PathwayConfig } from '../../domain/pathway-config';

/** The command payload to patch one pathway's process configuration. */
export interface UpdatePathwayConfigInput {
  pathway: Pathway;
  patch: Partial<PathwayConfig>;
}

/** A reactive view of the current settings (a live query over the preference stores). */
export interface SettingsView {
  readonly appearance: Signal<ThemePreference>;
  readonly piiRevealed: Signal<boolean>;
  readonly retentionDays: Signal<number>;
  readonly pathwayConfig: Signal<Record<Pathway, PathwayConfig>>;
}

/**
 * Port for application settings — a facade over the preference stores
 * (appearance, governance, per-pathway process config). Reads are reactive
 * Signals; the mutations are infallible preference writes (no Result needed).
 */
export interface ISettingsRepository {
  view(): SettingsView;
  setAppearance(pref: ThemePreference): void;
  togglePiiReveal(): void;
  setRetentionDays(days: number): void;
  updatePathwayConfig(input: UpdatePathwayConfigInput): void;
}

export const SETTINGS_REPOSITORY = new InjectionToken<ISettingsRepository>('ISettingsRepository');
