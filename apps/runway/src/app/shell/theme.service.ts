import { Injectable, computed, effect, signal } from '@angular/core';
import { loadJson, saveJson } from '../runtime/persist';

export type ThemePref = 'light' | 'dark' | 'system';

/** Applies the theme by toggling a `.dark` class on <html> (the `.dark` token scope in styles.css). */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly #mql = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  readonly pref = signal<ThemePref>(loadJson<ThemePref>('theme', 'light'));
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
    saveJson('theme', pref);
  }
}
