import { Injectable, inject } from '@angular/core';
import { RuntimeService } from '../../../../runtime/runtime.service';
import { ok, fail, type Result } from '../../../../shared/kernel/result';
import type { IActionRepository } from '../../application/ports/action.repository';
import type { Action } from '../../domain/action.entity';
import type { ResolveActionError, DismissActionError } from '../../domain/errors/action.errors';
import { ActionMapper } from '../mappers/action.mapper';
import type { ActionItem } from '../../../../domain/model';

/**
 * In-memory implementation of IActionRepository backed by the RuntimeStore
 * (the mock runtime). Swap for an HTTP implementation when the backend lands —
 * the port and everything above it stay unchanged.
 */
@Injectable({ providedIn: 'root' })
export class RuntimeActionRepository implements IActionRepository {
  readonly #rt = inject(RuntimeService);

  async list(): Promise<Action[]> {
    return this.#rt.actions().map((a) => this.#toDomain(a));
  }

  async getById(id: string): Promise<Action | null> {
    const a = this.#rt.actionById(id);
    return a ? this.#toDomain(a) : null;
  }

  async resolve(id: string): Promise<Result<Action, ResolveActionError>> {
    const a = this.#rt.actionById(id);
    if (!a) return fail({ kind: 'ActionNotFound', id, message: `This action was not found.` });
    if (a.status !== 'open') return fail({ kind: 'AlreadyClosed', id, message: `This action was already ${a.status}.` });
    this.#rt.resolveAction(id);
    return ok(this.#toDomain(this.#rt.actionById(id)!));
  }

  async dismiss(id: string): Promise<Result<Action, DismissActionError>> {
    const a = this.#rt.actionById(id);
    if (!a) return fail({ kind: 'ActionNotFound', id, message: `This action was not found.` });
    if (a.status !== 'open') return fail({ kind: 'AlreadyClosed', id, message: `This action was already ${a.status}.` });
    this.#rt.dismissAction(id);
    return ok(this.#toDomain(this.#rt.actionById(id)!));
  }

  #toDomain(a: ActionItem): Action {
    return ActionMapper.toDomain(a, this.#rt.caseByRef(a.caseRef)?.joinerName ?? a.caseRef);
  }
}
