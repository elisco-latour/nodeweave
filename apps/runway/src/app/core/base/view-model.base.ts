import { signal } from '@angular/core';
import { ObservableObject } from './observable-object';
import { fail, type NetworkError, type Result } from '../../shared/kernel/result';

/**
 * ViewModelBase — MVVM base for feature ViewModels.
 *
 * Provides shared `isLoading` / `error` (a banner string) signals and
 * `executeWithResult`, which wraps a fallible operation: it toggles loading,
 * lifts thrown infrastructure failures to a `NetworkError`, and surfaces any
 * failure's `message` on the `error` signal — while returning the typed
 * `Result` so callers can branch with `match`.
 *
 * ViewModels are `@Injectable()` (provided at the page component), inject Use
 * Cases only, and expose read-only signals.
 */
export abstract class ViewModelBase extends ObservableObject {
  readonly #loading = signal(false);
  readonly #error = signal<string | null>(null);

  readonly isLoading = this.#loading.asReadonly();
  readonly error = this.#error.asReadonly();

  /** Clear the shared banner error (e.g. before a retry, or on dismiss). */
  clearError(): void {
    this.#error.set(null);
  }

  /**
   * Run a fallible operation. Thrown exceptions become a `NetworkError`.
   * Use `executeWithResult<T, never>(...)` for operations with no domain errors.
   */
  protected async executeWithResult<T, E extends { message: string }>(
    operation: () => Promise<Result<T, E>>,
  ): Promise<Result<T, E | NetworkError>> {
    this.#loading.set(true);
    this.#error.set(null);
    try {
      const result = await operation();
      if (!result.ok) this.#error.set(result.error.message);
      return result;
    } catch (e) {
      const netErr: NetworkError = {
        kind: 'Network',
        message: e instanceof Error ? e.message : 'Something went wrong. Please try again.',
      };
      this.#error.set(netErr.message);
      return fail(netErr);
    } finally {
      this.#loading.set(false);
    }
  }
}
