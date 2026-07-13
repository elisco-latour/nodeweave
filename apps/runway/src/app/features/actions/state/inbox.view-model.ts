import { Injectable, computed, inject, signal } from '@angular/core';
import { ViewModelBase } from '../../../core/base/view-model.base';
import { match } from '../../../shared/kernel/result';
import type { ActionKind } from '../../../domain/model';
import type { Action } from '../domain/action.entity';
import { ListActionsUseCase } from '../application/use-cases/list-actions.use-case';
import { ResolveActionUseCase } from '../application/use-cases/resolve-action.use-case';
import { DismissActionUseCase } from '../application/use-cases/dismiss-action.use-case';

export type InboxTab = 'all' | 'pending';
export type InboxSort = 'newest' | 'oldest' | 'kind' | 'case';

/**
 * InboxViewModel — MVVM state for the Action Inbox. Injects use cases only,
 * exposes read-only signals, and routes fallible commands through
 * `executeWithResult` (which lifts thrown failures to NetworkError and surfaces
 * a banner via `error`). Provided at the inbox route so the list page and the
 * detail page share one instance.
 */
@Injectable()
export class InboxViewModel extends ViewModelBase {
  readonly #listActions = inject(ListActionsUseCase);
  readonly #resolveAction = inject(ResolveActionUseCase);
  readonly #dismissAction = inject(DismissActionUseCase);

  readonly #actions = this.state<Action[]>([]);
  readonly actions = this.#actions.asReadonly();

  readonly tab = signal<InboxTab>('all');
  readonly sortBy = signal<InboxSort>('newest');
  readonly kindFilter = signal<'all' | ActionKind>('all');

  readonly allCount = computed(() => this.actions().length);
  readonly pendingCount = computed(() => this.actions().filter((a) => a.isOpen).length);

  readonly visible = computed(() => {
    const status = this.tab();
    const kind = this.kindFilter();
    const rows = this.actions().filter(
      (a) => (status === 'all' || a.isOpen) && (kind === 'all' || a.kind === kind),
    );
    return [...rows].sort(this.#comparator(this.sortBy()));
  });

  constructor() {
    super();
    void this.load();
  }

  async load(): Promise<void> {
    const actions = await this.executeRead(() => this.#listActions.execute());
    if (actions) this.setProperty(this.#actions, actions);
  }

  byId(id: string): Action | undefined {
    return this.actions().find((a) => a.id === id);
  }

  async resolve(id: string): Promise<void> {
    const result = await this.executeWithResult(() => this.#resolveAction.execute(id));
    match(result, () => void this.load(), () => undefined);
  }

  async dismiss(id: string): Promise<void> {
    const result = await this.executeWithResult(() => this.#dismissAction.execute(id));
    match(result, () => void this.load(), () => undefined);
  }

  #comparator(sort: InboxSort): (a: Action, b: Action) => number {
    switch (sort) {
      case 'oldest': return (a, b) => a.createdAt.localeCompare(b.createdAt);
      case 'kind': return (a, b) => a.kind.localeCompare(b.kind) || b.createdAt.localeCompare(a.createdAt);
      case 'case': return (a, b) => a.caseRef.localeCompare(b.caseRef) || b.createdAt.localeCompare(a.createdAt);
      case 'newest':
      default: return (a, b) => b.createdAt.localeCompare(a.createdAt);
    }
  }
}
