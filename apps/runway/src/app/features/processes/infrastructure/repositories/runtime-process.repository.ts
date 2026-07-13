import { Injectable, inject } from '@angular/core';
import { ProcessStore } from '../../../../runtime/process-store';
import { ok, fail, type Result } from '../../../../shared/kernel/result';
import type { IProcessRepository, PublishProcessInput } from '../../application/ports/process.repository';
import type { Process } from '../../domain/process.entity';
import type { PublishProcessError } from '../../domain/errors/process.errors';
import { ProcessMapper } from '../mappers/process.mapper';

/**
 * In-memory implementation of IProcessRepository backed by the ProcessStore
 * (the persisted Compose→Operate contract). Swap for an HTTP implementation
 * when the backend lands — the port and everything above it stay unchanged.
 */
@Injectable({ providedIn: 'root' })
export class RuntimeProcessRepository implements IProcessRepository {
  readonly #store = inject(ProcessStore);

  async list(): Promise<Process[]> {
    return Object.values(this.#store.all())
      .filter((def): def is NonNullable<typeof def> => def != null)
      .map((def) => ProcessMapper.toDomain(def));
  }

  async publish(input: PublishProcessInput): Promise<Result<Process, PublishProcessError>> {
    if (this.#nodeCount(input.graph) === 0) {
      return fail({ kind: 'EmptyProcess', message: 'Add at least one step before publishing.' });
    }
    const def = this.#store.publish(input.pathway, input.graph);
    return ok(ProcessMapper.toDomain(def));
  }

  #nodeCount(graph: unknown): number {
    const nodes = (graph as { nodes?: unknown[] } | null)?.nodes;
    return Array.isArray(nodes) ? nodes.length : 0;
  }
}
