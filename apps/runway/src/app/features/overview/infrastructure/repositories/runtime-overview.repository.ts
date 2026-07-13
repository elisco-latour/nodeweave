import { Injectable, inject } from '@angular/core';
import { RuntimeService } from '../../../../runtime/runtime.service';
import { Case } from '../../../cases';
import type { IOverviewRepository } from '../../application/ports/overview.repository';

/**
 * In-memory implementation of IOverviewRepository backed by the RuntimeStore
 * (the mock runtime). Reads the shared case + action state the other slices
 * write to; swap for an HTTP implementation (a real GET /overview) later.
 */
@Injectable({ providedIn: 'root' })
export class RuntimeOverviewRepository implements IOverviewRepository {
  readonly #rt = inject(RuntimeService);

  async listCases(): Promise<Case[]> {
    this.#rt.assertAvailable();
    return this.#rt.cases().map((c) => new Case(c));
  }

  async openActionCount(): Promise<number> {
    this.#rt.assertAvailable();
    return this.#rt.openActions().length;
  }
}
