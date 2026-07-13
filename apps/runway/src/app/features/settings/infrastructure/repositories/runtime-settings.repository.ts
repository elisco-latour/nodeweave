import { Injectable, computed, inject, signal } from '@angular/core';
import { RuntimeService } from '../../../../runtime/runtime.service';
import { ThemeService } from '../../../../shell/theme.service';
import { loadJson, saveJson } from '../../../../runtime/persist';
import type { Pathway } from '../../../../domain/model';
import type {
  ISettingsRepository, SettingsView, UpdatePathwayConfigInput,
} from '../../application/ports/settings.repository';
import type { ThemePreference } from '../../domain/appearance';
import type { PathwayConfig } from '../../domain/pathway-config';

const DEFAULT_CONFIG: Record<Pathway, PathwayConfig> = {
  'centre-level': { requester: 'PPSO Operations', escalation: 'PPSO Head', leads: 'Centre Leads', remindAfterH: 24, escalateAfterH: 48 },
  'project-level': { requester: 'Project PMO', escalation: 'PPSO Head', leads: 'Project Lead', remindAfterH: 24, escalateAfterH: 48 },
};
const DEFAULT_RETENTION_DAYS = 365;

/**
 * Settings facade over the preference stores: appearance (ThemeService, applied
 * app-wide), governance (RuntimeService PII), event-log retention, and the
 * per-pathway process config (persisted here — this repository is now the config
 * store the old ConfigService used to be). Swap for an HTTP implementation when
 * the backend lands; the port and everything above it stay unchanged.
 */
@Injectable({ providedIn: 'root' })
export class RuntimeSettingsRepository implements ISettingsRepository {
  readonly #theme = inject(ThemeService);
  readonly #rt = inject(RuntimeService);

  readonly #config = signal<Record<Pathway, PathwayConfig>>(loadJson('config', DEFAULT_CONFIG));
  readonly #retention = signal<number>(loadJson('retention', DEFAULT_RETENTION_DAYS));

  readonly #view: SettingsView = {
    appearance: computed<ThemePreference>(() => this.#theme.pref()),
    piiRevealed: computed(() => this.#rt.piiAuthorized()),
    retentionDays: this.#retention.asReadonly(),
    pathwayConfig: this.#config.asReadonly(),
  };

  view(): SettingsView {
    return this.#view;
  }

  setAppearance(pref: ThemePreference): void {
    this.#theme.set(pref);
  }

  togglePiiReveal(): void {
    this.#rt.togglePii();
  }

  setRetentionDays(days: number): void {
    this.#retention.set(days);
    saveJson('retention', days);
  }

  updatePathwayConfig({ pathway, patch }: UpdatePathwayConfigInput): void {
    this.#config.update((map) => ({ ...map, [pathway]: { ...map[pathway], ...patch } }));
    saveJson('config', this.#config());
  }
}
