import { describe, it, expect } from 'vitest';
import { signal, type Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UpdatePathwayConfigUseCase } from './update-pathway-config.use-case';
import { SETTINGS_REPOSITORY, type ISettingsRepository, type SettingsView, type UpdatePathwayConfigInput } from '../ports/settings.repository';
import type { Pathway } from '../../../../domain/model';
import type { PathwayConfig } from '../../domain/pathway-config';
import type { ThemePreference } from '../../domain/appearance';

const seed: Record<Pathway, PathwayConfig> = {
  'centre-level': { requester: 'PPSO Operations', escalation: 'PPSO Head', leads: 'Centre Leads', remindAfterH: 24, escalateAfterH: 48 },
  'project-level': { requester: 'Project PMO', escalation: 'PPSO Head', leads: 'Project Lead', remindAfterH: 24, escalateAfterH: 48 },
};

/** Real in-memory interpreter at the repository boundary (no mocks). */
class InMemorySettingsRepository implements ISettingsRepository {
  readonly #config = signal(seed);
  view(): SettingsView {
    return {
      appearance: signal<ThemePreference>('light'),
      piiRevealed: signal(false),
      retentionDays: signal(365),
      pathwayConfig: this.#config.asReadonly() as Signal<Record<Pathway, PathwayConfig>>,
    };
  }
  setAppearance(): void {}
  togglePiiReveal(): void {}
  setRetentionDays(): void {}
  updatePathwayConfig({ pathway, patch }: UpdatePathwayConfigInput): void {
    this.#config.update((m) => ({ ...m, [pathway]: { ...m[pathway], ...patch } }));
  }
  current(): Record<Pathway, PathwayConfig> { return this.#config(); }
}

describe('UpdatePathwayConfigUseCase', () => {
  it('patches one pathway config, leaving the other untouched', async () => {
    const repo = new InMemorySettingsRepository();
    TestBed.configureTestingModule({
      providers: [UpdatePathwayConfigUseCase, { provide: SETTINGS_REPOSITORY, useValue: repo }],
    });
    TestBed.inject(UpdatePathwayConfigUseCase).execute({ pathway: 'centre-level', patch: { escalateAfterH: 72 } });

    expect(repo.current()['centre-level'].escalateAfterH).toBe(72);
    expect(repo.current()['centre-level'].requester).toBe('PPSO Operations'); // untouched fields kept
    expect(repo.current()['project-level'].escalateAfterH).toBe(48); // other pathway untouched
  });
});
