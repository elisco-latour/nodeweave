import { Injectable, computed, inject, signal } from '@angular/core';
import { ViewModelBase } from '../../../core/base/view-model.base';
import { match } from '../../../shared/kernel/result';
import type { Pathway } from '../../../domain/model';
import type { Process } from '../domain/process.entity';
import { ListProcessesUseCase } from '../application/use-cases/list-processes.use-case';
import { PublishProcessUseCase } from '../application/use-cases/publish-process.use-case';

/**
 * ComposeViewModel — MVVM state for the Process Studio. Owns the pathway
 * selection and the published-version status (derived from the loaded process
 * list); publish routes through `executeWithResult` so an empty process surfaces
 * a typed error. Canvas concerns (catalog, template seeding, drag/drop) stay in
 * the page component. Provided at the compose route.
 */
@Injectable()
export class ComposeViewModel extends ViewModelBase {
  readonly #listProcesses = inject(ListProcessesUseCase);
  readonly #publishProcess = inject(PublishProcessUseCase);

  readonly #processes = this.state<Process[]>([]);
  readonly pathway = signal<Pathway>('centre-level');

  readonly published = computed(() => this.#processes().find((p) => p.pathway === this.pathway()) ?? null);
  readonly isPublished = computed(() => !!this.published());
  readonly processName = computed(() => (this.pathway() === 'centre-level' ? 'centre-onboarding' : 'project-onboarding'));
  readonly versionLabel = computed(() => {
    const p = this.published();
    return p ? `v${p.version} · published` : 'draft';
  });

  constructor() {
    super();
    void this.load();
  }

  async load(): Promise<void> {
    const processes = await this.executeRead(() => this.#listProcesses.execute());
    if (processes) this.setProperty(this.#processes, processes);
  }

  setPathway(pathway: Pathway): void {
    this.pathway.set(pathway);
  }

  /** Publish the authored graph for the current pathway. Returns true on success. */
  async publish(graph: unknown): Promise<boolean> {
    const result = await this.executeWithResult(() => this.#publishProcess.execute({ pathway: this.pathway(), graph }));
    return match(result, () => { void this.load(); return true; }, () => false);
  }
}
