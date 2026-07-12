import { Injectable, signal } from '@angular/core';

/** The surfaces the shell can show. Inbox/Cases/Compose are primary nav; Help is reached from the command bar. */
export type View = 'inbox' | 'cases' | 'compose' | 'help';

/**
 * Navigation state for the shell — which surface is showing, which case is
 * selected, and whether an Inbox card should be focused. Lifted out of the
 * components so global search + the guided tour can drive the app.
 */
@Injectable({ providedIn: 'root' })
export class ShellService {
  readonly view = signal<View>('inbox');
  readonly selectedCaseRef = signal<string | null>(null);
  /** When set, the Inbox scrolls to + briefly highlights this action (e.g. from search). */
  readonly focusActionId = signal<string | null>(null);

  show(view: View): void {
    this.view.set(view);
  }

  /** Open a case in the Cases surface. */
  openCase(caseRef: string): void {
    this.selectedCaseRef.set(caseRef);
    this.view.set('cases');
  }

  /** Jump to the Inbox and focus a specific action. */
  openAction(actionId: string): void {
    this.focusActionId.set(actionId);
    this.view.set('inbox');
  }

  consumeFocusAction(): void {
    this.focusActionId.set(null);
  }
}
