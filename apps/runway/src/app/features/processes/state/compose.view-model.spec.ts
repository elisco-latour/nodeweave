import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ComposeViewModel } from './compose.view-model';
import { ListProcessesUseCase } from '../application/use-cases/list-processes.use-case';
import { PublishProcessUseCase } from '../application/use-cases/publish-process.use-case';
import { Process } from '../domain/process.entity';
import { ok, fail } from '../../../shared/kernel/result';

function configure(providers: unknown[]) {
  TestBed.configureTestingModule({ providers: [ComposeViewModel, ...(providers as never[])] });
  return TestBed.inject(ComposeViewModel);
}

describe('ComposeViewModel', () => {
  it('derives the published status and version label for the selected pathway', async () => {
    const centre = new Process({ pathway: 'centre-level', version: 2, graph: {}, publishedAt: 'x' });
    const vm = configure([
      { provide: ListProcessesUseCase, useValue: { execute: async () => [centre] } },
      { provide: PublishProcessUseCase, useValue: { execute: async () => ok(centre) } },
    ]);
    await vm.load();

    expect(vm.isPublished()).toBe(true); // centre-level is the default pathway
    expect(vm.versionLabel()).toBe('v2 · published');

    vm.setPathway('project-level'); // nothing published for this pathway
    expect(vm.isPublished()).toBe(false);
    expect(vm.versionLabel()).toBe('draft');
  });

  it('surfaces the domain error message when publishing an empty process', async () => {
    const vm = configure([
      { provide: ListProcessesUseCase, useValue: { execute: async () => [] } },
      { provide: PublishProcessUseCase, useValue: { execute: async () => fail({ kind: 'EmptyProcess', message: 'Add at least one step before publishing.' }) } },
    ]);
    const okResult = await vm.publish({ nodes: [] });
    expect(okResult).toBe(false);
    expect(vm.error()).toBe('Add at least one step before publishing.');
  });
});
