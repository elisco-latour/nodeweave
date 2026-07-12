import { Injectable, signal } from '@angular/core';
import { loadJson, saveJson } from '../runtime/persist';
import type { Pathway } from '../domain/model';

/**
 * Per-pathway process configuration — the `{{config.*}}` values the workflow
 * engine resolves (owners, escalation, SLA offsets). Editable in Settings,
 * persisted; stands in for the backend's Project Config List.
 */
export interface PathwayConfig {
  requester: string;
  escalation: string;
  leads: string;
  remindAfterH: number;
  escalateAfterH: number;
}

type ConfigMap = Record<Pathway, PathwayConfig>;

const DEFAULT: ConfigMap = {
  'centre-level': { requester: 'PPSO Operations', escalation: 'PPSO Head', leads: 'Centre Leads', remindAfterH: 24, escalateAfterH: 48 },
  'project-level': { requester: 'Project PMO', escalation: 'PPSO Head', leads: 'Project Lead', remindAfterH: 24, escalateAfterH: 48 },
};

@Injectable({ providedIn: 'root' })
export class ConfigService {
  readonly #map = signal<ConfigMap>(loadJson<ConfigMap>('config', DEFAULT));
  readonly all = this.#map.asReadonly();

  get(pathway: Pathway): PathwayConfig {
    return this.#map()[pathway];
  }

  update(pathway: Pathway, patch: Partial<PathwayConfig>): void {
    this.#map.update((m) => ({ ...m, [pathway]: { ...m[pathway], ...patch } }));
    saveJson('config', this.#map());
  }
}
