import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

/** Top-level surfaces (also the route paths). */
export type View = 'inbox' | 'cases' | 'compose' | 'help';

/**
 * Thin navigation facade over the Router — lets search, the guided tour, and
 * Help drive the app without each knowing the route shapes. Also carries the
 * "focus this Inbox action" signal (e.g. when a search result is an action).
 */
@Injectable({ providedIn: 'root' })
export class ShellService {
  readonly #router = inject(Router);
  readonly focusActionId = signal<string | null>(null);

  show(view: View): void {
    this.#router.navigate(['/', view]);
  }

  /** Open a case (deep-linkable /cases/:ref). */
  openCase(caseRef: string): void {
    this.#router.navigate(['/cases', caseRef]);
  }

  /** Jump to the Inbox and focus a specific action. */
  openAction(actionId: string): void {
    this.focusActionId.set(actionId);
    this.#router.navigate(['/inbox']);
  }

  consumeFocusAction(): void {
    this.focusActionId.set(null);
  }
}
