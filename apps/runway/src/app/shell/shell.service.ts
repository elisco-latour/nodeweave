import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

/** Top-level surfaces (also the route paths). */
export type View = 'home' | 'inbox' | 'cases' | 'compose' | 'help' | 'settings';

/**
 * Thin navigation facade over the Router — lets search, the guided tour, and
 * notifications drive the app without each knowing the route shapes.
 */
@Injectable({ providedIn: 'root' })
export class ShellService {
  readonly #router = inject(Router);

  show(view: View): void {
    this.#router.navigate(['/', view]);
  }

  /** Open a case detail (deep-linkable /cases/:ref). */
  openCase(caseRef: string): void {
    this.#router.navigate(['/cases', caseRef]);
  }

  /** Open an action in the Inbox reading pane (/inbox/:actionId). */
  openAction(actionId: string): void {
    this.#router.navigate(['/inbox', actionId]);
  }
}
