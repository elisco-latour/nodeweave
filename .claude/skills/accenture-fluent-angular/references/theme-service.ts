/**
 * ThemeService — Light / Dark / System, wired to the `.dark` token scope.
 *
 * Toggles a `.dark` class on <html>; the `.dark` block in design-tokens.css
 * overrides the semantic tokens, so the whole app re-themes for free.
 *
 * GOTCHA (why `document`, not `DOCUMENT`): injecting `DOCUMENT` from
 * '@angular/common' can mismatch the platform-provided token on recent Angular
 * (throws NG0201: "No provider found for InjectionToken DocumentToken"). Use the
 * `document` global directly — this is a browser app.
 *
 * Inject it ONCE at the app root (e.g. `readonly #theme = inject(ThemeService)`
 * in the root component) so the saved preference is applied on boot.
 */
import { Injectable, computed, effect, signal } from '@angular/core';

export type ThemePref = 'light' | 'dark' | 'system';

const KEY = 'app.theme';

function load(): ThemePref {
  try { return (localStorage.getItem(KEY) as ThemePref) || 'light'; } catch { return 'light'; }
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly #mql = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  readonly pref = signal<ThemePref>(load());
  readonly #systemDark = signal<boolean>(this.#mql?.matches ?? false);
  readonly resolved = computed<'light' | 'dark'>(() => {
    const p = this.pref();
    if (p === 'system') return this.#systemDark() ? 'dark' : 'light';
    return p;
  });

  constructor() {
    this.#mql?.addEventListener('change', (e) => this.#systemDark.set(e.matches));
    effect(() => {
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', this.resolved() === 'dark');
      }
    });
  }

  set(pref: ThemePref): void {
    this.pref.set(pref);
    try { localStorage.setItem(KEY, pref); } catch { /* storage unavailable */ }
  }
}
