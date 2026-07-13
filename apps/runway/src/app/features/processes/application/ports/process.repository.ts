import { InjectionToken } from '@angular/core';
import type { Result } from '../../../../shared/kernel/result';
import type { Pathway } from '../../../../domain/model';
import type { Process } from '../../domain/process.entity';
import type { PublishProcessError } from '../../domain/errors/process.errors';

/** The command payload to publish a new version of a pathway's process. */
export interface PublishProcessInput {
  pathway: Pathway;
  /** The authored graph (nodeweave CanvasState JSON). */
  graph: unknown;
}

/**
 * Port for published processes. `list` is an infallible read (throws only on
 * infrastructure failure); `publish` returns a `Result` because "empty process"
 * is a business outcome the caller must handle.
 */
export interface IProcessRepository {
  list(): Promise<Process[]>;
  publish(input: PublishProcessInput): Promise<Result<Process, PublishProcessError>>;
}

export const PROCESS_REPOSITORY = new InjectionToken<IProcessRepository>('IProcessRepository');
