import { signal } from '@angular/core';
import { ObservableObject } from './observable-object';
import { fail, type NetworkError, type Result } from '../../shared/kernel/result';

/**
 * ViewModelBase — MVVM base for feature ViewModels.
 *
 * Provides shared `isLoading` / `error` (a banner string) signals plus two
 * wrappers that toggle loading and surface failures on `error`:
 *   - `executeWithResult` — for fallible *commands* that return a `Result`.
 *   - `executeRead` — for *queries* that return a plain value and may throw
 *     (a network/backend failure); returns `null` on failure so the caller can
 *     keep its prior state and the page can show an error-with-retry.
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

  /**
   * Run a read (a query that returns a plain value and may throw on a
   * backend/network failure). Toggles loading, clears then sets `error` on
   * throw, and returns `null` on failure so the caller keeps its prior state.
   */
  protected async executeRead<T>(operation: () => Promise<T>): Promise<T | null> {
    this.#loading.set(true);
    this.#error.set(null);
    try {
      return await operation();
    } catch (e) {
      this.#error.set(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      return null;
    } finally {
      this.#loading.set(false);
    }
  }
}
