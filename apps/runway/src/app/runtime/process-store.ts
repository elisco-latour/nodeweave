import { Injectable, signal } from '@angular/core';
import type { Pathway } from '../domain/model';
import { loadJson, saveJson } from './persist';

/** A published, versioned process definition (the nodeweave graph JSON). */
export interface ProcessDefinition {
  pathway: Pathway;
  version: number;
  graph: unknown; // CanvasState JSON from the Compose canvas
  publishedAt: string;
}

type Published = Record<Pathway, ProcessDefinition | null>;
const EMPTY: Published = { 'centre-level': null, 'project-level': null };

/**
 * Store of published process versions. Compose publishes here; Operate reads
 * the published version to render a case's live map. Persisted so a published
 * process survives a refresh — the stable Compose→Operate contract.
 */
@Injectable({ providedIn: 'root' })
export class ProcessStore {
  readonly #map = signal<Published>(loadJson<Published>('processes', EMPTY));
  readonly all = this.#map.asReadonly();

  /** Reactive read — use in a computed/effect to react to new publishes. */
  published(pathway: Pathway): ProcessDefinition | null {
    return this.#map()[pathway];
  }

  publish(pathway: Pathway, graph: unknown): ProcessDefinition {
    const current = this.#map()[pathway];
    const def: ProcessDefinition = {
      pathway,
      version: (current?.version ?? 0) + 1,
      graph,
      publishedAt: new Date().toISOString(),
    };
    this.#map.update((m) => ({ ...m, [pathway]: def }));
    saveJson('processes', this.#map());
    return def;
  }
}
