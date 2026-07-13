/**
 * UseCase<TParam, TResult> — one business action per class.
 *
 * `@Injectable({ providedIn: 'root' })`, injects only port tokens / other use
 * cases. `TResult` is the resolved payload: a plain `T` for infallible actions,
 * or `Result<T, E>` for fallible ones. Use `void` for `TParam` when there is no
 * input.
 */
export interface UseCase<TParam, TResult> {
  execute(param: TParam): Promise<TResult>;
}
