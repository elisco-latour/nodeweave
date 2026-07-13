import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PublishProcessUseCase } from './publish-process.use-case';
import { PROCESS_REPOSITORY, type IProcessRepository, type PublishProcessInput } from '../ports/process.repository';
import { Process } from '../../domain/process.entity';
import { ok, fail, isOk, isFail, type Result } from '../../../../shared/kernel/result';
import type { PublishProcessError } from '../../domain/errors/process.errors';

/** Real in-memory interpreter at the repository boundary (no mocks). */
class InMemoryProcessRepository implements IProcessRepository {
  published: Process[] = [];
  async list(): Promise<Process[]> { return this.published; }
  async publish(input: PublishProcessInput): Promise<Result<Process, PublishProcessError>> {
    const nodes = (input.graph as { nodes?: unknown[] } | null)?.nodes;
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return fail({ kind: 'EmptyProcess', message: 'Add at least one step before publishing.' });
    }
    const p = new Process({ pathway: input.pathway, version: this.published.length + 1, graph: input.graph, publishedAt: 'x' });
    this.published = [p];
    return ok(p);
  }
}

describe('PublishProcessUseCase', () => {
  it('publishes a non-empty process', async () => {
    TestBed.configureTestingModule({
      providers: [PublishProcessUseCase, { provide: PROCESS_REPOSITORY, useValue: new InMemoryProcessRepository() }],
    });
    const res = await TestBed.inject(PublishProcessUseCase).execute({ pathway: 'centre-level', graph: { nodes: [{ id: 'a' }], edges: [] } });
    expect(isOk(res)).toBe(true);
    if (isOk(res)) expect(res.value.version).toBe(1);
  });

  it('returns EmptyProcess when the graph has no steps', async () => {
    TestBed.configureTestingModule({
      providers: [PublishProcessUseCase, { provide: PROCESS_REPOSITORY, useValue: new InMemoryProcessRepository() }],
    });
    const res = await TestBed.inject(PublishProcessUseCase).execute({ pathway: 'centre-level', graph: { nodes: [], edges: [] } });
    expect(isFail(res)).toBe(true);
    if (isFail(res)) expect(res.error.kind).toBe('EmptyProcess');
  });
});
