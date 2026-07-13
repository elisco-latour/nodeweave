import { signal, type WritableSignal } from '@angular/core';

/**
 * ObservableObject — signal-state base for ViewModels.
 *
 * Subclasses create private writable signals via `state()` and expose them as
 * read-only (`.asReadonly()`). All mutation goes through `setProperty()` /
 * `updateProperty()` / `batchUpdate()` so state changes stay centralised and
 * intentional. Angular signal writes are glitch-free and coalesced per tick, so
 * `batchUpdate` is a readability wrapper, not a scheduler.
 */
export abstract class ObservableObject {
  /** Create a private state signal. Expose it from the subclass via `.asReadonly()`. */
  protected state<T>(initial: T): WritableSignal<T> {
    return signal(initial);
  }

  protected setProperty<T>(sig: WritableSignal<T>, value: T): void {
    sig.set(value);
  }

  protected updateProperty<T>(sig: WritableSignal<T>, updater: (current: T) => T): void {
    sig.update(updater);
  }

  /** Run several signal mutations together (readability; writes are already coalesced). */
  protected batchUpdate(mutations: () => void): void {
    mutations();
  }
}
