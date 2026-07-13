import { Injectable, computed, inject, signal } from '@angular/core';
import { ViewModelBase } from '../../../core/base/view-model.base';
import { match } from '../../../shared/kernel/result';
import type { Case } from '../domain/case.entity';
import {
  queryCases, countByFilter, type CaseFilterId, type CaseSortId, type CasePage,
} from '../application/queries/case-query';
import { ListCasesUseCase } from '../application/use-cases/list-cases.use-case';
import { CreateCaseUseCase } from '../application/use-cases/create-case.use-case';
import type { CreateCaseInput } from '../application/ports/case.repository';

const TABLE_PAGE = 25;

/**
 * CasesViewModel — MVVM state for the Cases registry. Loads all cases once via
 * a use case, then derives the current page, per-filter counts, and range with
 * `computed()` over the filter/sort/search/page signals (the query engine is
 * pure application logic). Create routes through `executeWithResult` so an
 * invalid intake surfaces as a typed error. Provided at the cases route.
 */
@Injectable()
export class CasesViewModel extends ViewModelBase {
  readonly #listCases = inject(ListCasesUseCase);
  readonly #createCase = inject(CreateCaseUseCase);

  readonly #cases = this.state<Case[]>([]);
  readonly cases = this.#cases.asReadonly();

  readonly filterId = signal<CaseFilterId>('all');
  readonly sort = signal<CaseSortId>('deadline');
  readonly search = signal('');
  readonly page = signal(0);

  readonly counts = computed(() => countByFilter(this.cases()));
  readonly result = computed<CasePage>(() =>
    queryCases(this.cases(), {
      search: this.search(), filter: this.filterId(), sort: this.sort(), page: this.page(), pageSize: TABLE_PAGE,
    }));
  readonly rangeFrom = computed(() => (this.result().matched === 0 ? 0 : this.result().page * TABLE_PAGE + 1));
  readonly rangeTo = computed(() => Math.min((this.result().page + 1) * TABLE_PAGE, this.result().matched));

  constructor() {
    super();
    void this.load();
  }

  async load(): Promise<void> {
    const cases = await this.executeRead(() => this.#listCases.execute());
    if (cases) this.setProperty(this.#cases, cases);
  }

  /** Re-read from the store — stands in for a backend refetch. */
  async refresh(): Promise<void> {
    await this.load();
  }

  setFilter(f: CaseFilterId): void { this.filterId.set(f); this.page.set(0); }
  setSort(s: CaseSortId): void { this.sort.set(s); this.page.set(0); }
  setSearch(v: string): void { this.search.set(v); this.page.set(0); }
  prevPage(): void { this.page.update((p) => Math.max(0, p - 1)); }
  nextPage(): void { this.page.update((p) => Math.min(this.result().pageCount - 1, p + 1)); }

  /** All cases matching the current filter/search/sort, ignoring pagination (for export). */
  allMatched(): Case[] {
    return queryCases(this.cases(), {
      search: this.search(), filter: this.filterId(), sort: this.sort(), page: 0, pageSize: Number.MAX_SAFE_INTEGER,
    }).rows;
  }

  /** Create a case from a validated intake. Returns the new Case on success, or null. */
  async create(input: CreateCaseInput): Promise<Case | null> {
    const result = await this.executeWithResult(() => this.#createCase.execute(input));
    return match(result, (c) => { void this.load(); return c; }, () => null);
  }
}
