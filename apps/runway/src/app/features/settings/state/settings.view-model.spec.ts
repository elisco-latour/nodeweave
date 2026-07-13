import { describe, it, expect, vi } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SettingsViewModel } from './settings.view-model';
import { GetSettingsUseCase } from '../application/use-cases/get-settings.use-case';
import { SetAppearanceUseCase } from '../application/use-cases/set-appearance.use-case';
import { TogglePiiRevealUseCase } from '../application/use-cases/toggle-pii-reveal.use-case';
import { SetRetentionUseCase } from '../application/use-cases/set-retention.use-case';
import { UpdatePathwayConfigUseCase } from '../application/use-cases/update-pathway-config.use-case';
import type { SettingsView } from '../application/ports/settings.repository';
import type { ThemePreference } from '../domain/appearance';

function view() {
  const appearance = signal<ThemePreference>('light');
  const piiRevealed = signal(false);
  const retentionDays = signal(365);
  const pathwayConfig = signal({
    'centre-level': { requester: 'PPSO Operations', escalation: 'PPSO Head', leads: 'Centre Leads', remindAfterH: 24, escalateAfterH: 48 },
    'project-level': { requester: 'Project PMO', escalation: 'PPSO Head', leads: 'Project Lead', remindAfterH: 24, escalateAfterH: 48 },
  });
  return { appearance, piiRevealed, retentionDays, pathwayConfig };
}

describe('SettingsViewModel', () => {
  it('exposes the reactive settings view and reads a pathway config', () => {
    const v = view();
    const vm = configure(v, {});
    expect(vm.appearance()).toBe('light');
    expect(vm.piiRevealed()).toBe(false);
    expect(vm.retentionDays()).toBe(365);
    expect(vm.configFor('project-level').requester).toBe('Project PMO');
  });

  it('forwards each edit to its command use case', () => {
    const v = view();
    const setAppearance = vi.fn((p: ThemePreference) => v.appearance.set(p));
    const togglePii = vi.fn(() => v.piiRevealed.update((x) => !x));
    const setRetention = vi.fn((d: number) => v.retentionDays.set(d));
    const updateConfig = vi.fn();
    const vm = configure(v, { setAppearance, togglePii, setRetention, updateConfig });

    vm.setAppearance('dark');
    vm.togglePii();
    vm.setRetention(90);
    vm.updateConfig('centre-level', { escalateAfterH: 72 });

    expect(setAppearance).toHaveBeenCalledWith('dark');
    expect(togglePii).toHaveBeenCalledOnce();
    expect(setRetention).toHaveBeenCalledWith(90);
    expect(updateConfig).toHaveBeenCalledWith({ pathway: 'centre-level', patch: { escalateAfterH: 72 } });
    // reactive view reflects the stubbed writes
    expect(vm.appearance()).toBe('dark');
    expect(vm.piiRevealed()).toBe(true);
    expect(vm.retentionDays()).toBe(90);
  });
});

interface Stubs {
  setAppearance?: (p: ThemePreference) => void;
  togglePii?: () => void;
  setRetention?: (d: number) => void;
  updateConfig?: (input: unknown) => void;
}

function configure(v: SettingsView, stubs: Stubs) {
  TestBed.configureTestingModule({
    providers: [
      SettingsViewModel,
      { provide: GetSettingsUseCase, useValue: { execute: () => v } },
      { provide: SetAppearanceUseCase, useValue: { execute: stubs.setAppearance ?? (() => undefined) } },
      { provide: TogglePiiRevealUseCase, useValue: { execute: stubs.togglePii ?? (() => undefined) } },
      { provide: SetRetentionUseCase, useValue: { execute: stubs.setRetention ?? (() => undefined) } },
      { provide: UpdatePathwayConfigUseCase, useValue: { execute: stubs.updateConfig ?? (() => undefined) } },
    ],
  });
  return TestBed.inject(SettingsViewModel);
}
