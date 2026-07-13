import { Injectable, signal } from '@angular/core';
import { maskPersonal } from '../../domain/data-dictionary';

/**
 * GovernanceService — cross-cutting data-governance policy.
 *
 * Owns whether the current viewer is authorized to see personal data (PII) and
 * applies the masking policy. Revealing PII is an authorization decision, so
 * this is the single place that gates it — components mask through `mask()`
 * rather than reading a raw flag and calling `maskPersonal` themselves.
 *
 * Per-session authorization (not persisted). Lives in `core/` because it is a
 * cross-cutting concern (like auth), consumed by many features and the shell.
 */
@Injectable({ providedIn: 'root' })
export class GovernanceService {
  readonly #piiRevealed = signal(false);

  /** Whether personal data is currently revealed to the viewer. */
  readonly piiRevealed = this.#piiRevealed.asReadonly();

  reveal(): void { this.#piiRevealed.set(true); }
  hide(): void { this.#piiRevealed.set(false); }
  toggle(): void { this.#piiRevealed.update((revealed) => !revealed); }

  /** Mask a personal value unless the viewer is authorized to see it. Reactive. */
  mask(value: string): string {
    return maskPersonal(value, this.#piiRevealed());
  }
}
