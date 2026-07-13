/**
 * <ui-icon> — Fluent System Icons vendored as inline SVG.
 *
 * WHY inline (not a package): Microsoft's own icon set (what Fluent/Teams/Lists
 * use), rendered as `currentColor` so an icon inherits text colour + theming for
 * free. Zero runtime dependency, tree-shaken to only what you use, and no
 * Angular peer-version conflicts (do NOT use `lucide-angular` on Angular 22 —
 * its peer range lags). No emojis anywhere in the app.
 *
 * ADD A GLYPH:
 *   1. Fetch it (regular weight, 24px grid):
 *        curl -s https://unpkg.com/@fluentui/svg-icons/icons/<snake_name>_24_regular.svg
 *      e.g. alert_24_regular, checkmark_circle_24_regular, arrow_download_24_regular.
 *      Use *_24_filled for active/selected states (e.g. the active nav item).
 *   2. Copy the inner `<path .../>` markup into REGISTRY below.
 *   3. Add the key to the IconName union.
 *   Browse names at https://github.com/microsoft/fluentui-system-icons
 *
 * Rename the selector to your app prefix (ui-, ax-, app-…). Uses DomSanitizer to
 * render the SVG; the strings here are trusted (your own vendored assets).
 */
import { Component, ChangeDetectionStrategy, computed, inject, input } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

export type IconName =
  | 'home' | 'home-filled'
  | 'inbox' | 'inbox-filled'
  | 'search' | 'settings' | 'help' | 'alert'
  | 'add' | 'dismiss' | 'check' | 'check-circle'
  | 'warning' | 'error-circle' | 'info'
  | 'chevron-right' | 'chevron-down'
  | 'eye' | 'eye-off';

// Starter set. Replace/extend with the glyphs your app needs (see header recipe).
const REGISTRY: Record<IconName, string> = {
  home:
    '<path d="M10.55 2.53c.84-.7 2.06-.7 2.9 0l6.75 5.7c.5.42.8 1.05.8 1.71v9.31c0 .97-.78 1.75-1.75 1.75h-3.5c-.97 0-1.75-.78-1.75-1.75v-5a.25.25 0 0 0-.25-.25h-3.5a.25.25 0 0 0-.25.25v5c0 .97-.78 1.75-1.75 1.75h-3.5C3.78 21 3 20.22 3 19.25v-9.3c0-.67.3-1.3.8-1.73l6.75-5.69Zm1.93 1.15a.75.75 0 0 0-.96 0l-6.75 5.7a.75.75 0 0 0-.27.56v9.31c0 .14.11.25.25.25h3.5c.14 0 .25-.1.25-.25v-5c0-.97.78-1.75 1.75-1.75h3.5c.97 0 1.75.78 1.75 1.75v5c0 .14.11.25.25.25h3.5c.14 0 .25-.1.25-.25v-9.3c0-.23-.1-.44-.27-.58l-6.75-5.7Z"/>',
  'home-filled':
    '<path d="M13.45 2.53c-.84-.7-2.06-.7-2.9 0L3.8 8.23c-.5.43-.8 1.05-.8 1.72v9.3c0 .97.78 1.75 1.75 1.75h3c.97 0 1.75-.78 1.75-1.75v-4c0-.68.54-1.23 1.22-1.25h2.56c.68.02 1.22.57 1.22 1.25v4c0 .97.78 1.75 1.75 1.75h3c.97 0 1.75-.78 1.75-1.75v-9.3c0-.67-.3-1.3-.8-1.72l-6.75-5.7Z"/>',
  inbox:
    '<path d="M6.25 3h11.5a3.25 3.25 0 0 1 3.24 3.07l.01.18v11.5a3.25 3.25 0 0 1-3.07 3.24l-.18.01H6.25a3.25 3.25 0 0 1-3.24-3.07L3 17.75V6.25a3.25 3.25 0 0 1 3.07-3.24L6.25 3h11.5-11.5ZM4.5 14.5v3.25c0 .92.7 1.67 1.6 1.74l.15.01h11.5c.92 0 1.67-.7 1.74-1.6l.01-.15V14.5h-3.82a3.75 3.75 0 0 1-3.48 3H12a3.75 3.75 0 0 1-3.63-2.81l-.04-.19H4.5Zm13.25-10H6.25c-.92 0-1.67.7-1.74 1.6l-.01.15V13H9c.38 0 .7.28.74.65l.01.1a2.25 2.25 0 0 0 4.5.15v-.15c0-.38.28-.7.65-.74L15 13h4.5V6.25c0-.92-.7-1.67-1.6-1.74l-.15-.01Z"/>',
  'inbox-filled':
    '<path d="M17.75 3C19.55 3 21 4.46 21 6.25v11.5c0 1.8-1.46 3.25-3.25 3.25H6.25A3.25 3.25 0 0 1 3 17.75V6.25C3 4.45 4.46 3 6.25 3h11.5Zm0 1.5H6.25c-.97 0-1.75.78-1.75 1.75V13H9c.38 0 .7.28.74.65l.01.1a2.25 2.25 0 0 0 4.5 0c0-.41.34-.75.75-.75h4.5V6.25c0-.92-.7-1.67-1.6-1.74l-.15-.01Z"/>',
  search:
    '<path d="M16.1 17.16a8 8 0 1 1 1.06-1.06l4.62 4.62a.75.75 0 1 1-1.06 1.06l-4.62-4.62ZM17.5 11a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z"/>',
  settings:
    '<path d="M12.01 2.25c.74 0 1.47.1 2.18.25.32.07.55.33.59.65l.17 1.53a1.38 1.38 0 0 0 1.92 1.11l1.4-.61c.3-.13.64-.06.85.17a9.8 9.8 0 0 1 2.2 3.8c.1.3 0 .63-.26.82l-1.25.92a1.38 1.38 0 0 0 0 2.22l1.25.92c.26.19.36.52.27.82a9.8 9.8 0 0 1-2.2 3.8.75.75 0 0 1-.85.17l-1.4-.62a1.38 1.38 0 0 0-1.93 1.12l-.17 1.52a.75.75 0 0 1-.58.65 9.52 9.52 0 0 1-4.4 0 .75.75 0 0 1-.57-.65l-.17-1.52a1.38 1.38 0 0 0-1.93-1.11l-1.4.62a.75.75 0 0 1-.85-.18 9.8 9.8 0 0 1-2.2-3.8c-.1-.3 0-.63.26-.82l1.25-.92a1.38 1.38 0 0 0 0-2.22l-1.24-.92a.75.75 0 0 1-.28-.82 9.8 9.8 0 0 1 2.2-3.8c.23-.23.57-.3.86-.17l1.4.62c.4.17.86.15 1.25-.08.38-.22.63-.6.68-1.04l.17-1.53a.75.75 0 0 1 .58-.65c.72-.16 1.45-.24 2.2-.25Zm0 1.5c-.45 0-.9.04-1.35.12l-.11.97a2.89 2.89 0 0 1-4.03 2.33l-.9-.4A8.3 8.3 0 0 0 4.29 9.1l.8.59a2.88 2.88 0 0 1 0 4.64l-.8.59a8.3 8.3 0 0 0 1.35 2.32l.9-.4a2.88 2.88 0 0 1 4.02 2.32l.1.99c.9.15 1.8.15 2.7 0l.1-.99a2.88 2.88 0 0 1 4.02-2.32l.9.4a8.3 8.3 0 0 0 1.35-2.32l-.8-.59a2.88 2.88 0 0 1 0-4.64l.8-.59a8.3 8.3 0 0 0-1.35-2.32l-.9.4a2.88 2.88 0 0 1-4.02-2.32l-.1-.98c-.45-.08-.9-.11-1.34-.12ZM12 8.25a3.75 3.75 0 1 1 0 7.5 3.75 3.75 0 0 1 0-7.5Zm0 1.5a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z"/>',
  help:
    '<path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 1.67a8.34 8.34 0 0 0 0 16.66 8.34 8.34 0 0 0 0-16.66Zm0 11.83a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm0-8.75a2.75 2.75 0 0 1 2.75 2.75c0 1.01-.3 1.57-1.05 2.36l-.17.17c-.62.62-.78.89-.78 1.47a.75.75 0 0 1-1.5 0c0-1.01.3-1.57 1.05-2.36l.17-.17c.62-.62.78-.89.78-1.47a1.25 1.25 0 0 0-2.5-.13v.13a.75.75 0 0 1-1.5 0A2.75 2.75 0 0 1 12 6.75Z"/>',
  alert:
    '<path d="M12 2a7.5 7.5 0 0 1 7.5 7.25v4.35l1.38 3.15a1.25 1.25 0 0 1-1.15 1.75H15a3 3 0 0 1-6 .18v-.18H4.27a1.25 1.25 0 0 1-1.14-1.75L4.5 13.6V9.5C4.5 5.35 7.85 2 12 2Zm1.5 16.5h-3a1.5 1.5 0 0 0 3 .15v-.15ZM12 3.5c-3.32 0-6 2.67-6 6v4.4L4.66 17h14.7L18 13.9V9.29a5.99 5.99 0 0 0-6-5.78Z"/>',
  add:
    '<path d="M12 3.25c.41 0 .75.34.75.75v7.25H20a.75.75 0 0 1 0 1.5h-7.25V20a.75.75 0 0 1-1.5 0v-7.25H4a.75.75 0 0 1 0-1.5h7.25V4c0-.41.34-.75.75-.75Z"/>',
  dismiss:
    '<path d="m4.4 4.55.07-.08a.75.75 0 0 1 .98-.07l.08.07L12 10.94l6.47-6.47a.75.75 0 1 1 1.06 1.06L13.06 12l6.47 6.47c.27.27.3.68.07.98l-.07.08a.75.75 0 0 1-.98.07l-.08-.07L12 13.06l-6.47 6.47a.75.75 0 0 1-1.06-1.06L10.94 12 4.47 5.53a.75.75 0 0 1-.07-.98Z"/>',
  check:
    '<path d="M4.53 12.97a.75.75 0 0 0-1.06 1.06l4.5 4.5c.3.3.77.3 1.06 0l11-11a.75.75 0 0 0-1.06-1.06L8.5 16.94l-3.97-3.97Z"/>',
  'check-circle':
    '<path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm-1.25 9.94 4.47-4.47a.75.75 0 0 1 1.13.98l-.07.08-5 5a.75.75 0 0 1-.98.07l-.08-.07-2.5-2.5a.75.75 0 0 1 .98-1.13l.08.07 1.97 1.97 4.47-4.47-4.47 4.47Z"/>',
  warning:
    '<path d="M9.14 3.7a3.25 3.25 0 0 1 5.72 0l6.74 12.5a3.25 3.25 0 0 1-2.86 4.8H5.25a3.25 3.25 0 0 1-2.86-4.8L9.14 3.7Zm4.4.72a1.75 1.75 0 0 0-3.08 0L3.7 16.92a1.75 1.75 0 0 0 1.54 2.58h13.5a1.75 1.75 0 0 0 1.53-2.58l-6.74-12.5ZM12 15a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm0-7.5c.41 0 .75.34.75.75v4.5a.75.75 0 0 1-1.5 0v-4.5c0-.41.34-.75.75-.75Z"/>',
  'error-circle':
    '<path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm0 11a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM12 7c.37 0 .69.28.74.65v4.6a.75.75 0 0 1-1.48.1l-.01-.1v-4.5c0-.41.33-.75.74-.75Z"/>',
  info:
    '<path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm0 7c.41 0 .75.34.75.75v5a.75.75 0 0 1-1.5 0v-5c0-.41.34-.75.75-.75ZM12 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/>',
  'chevron-right':
    '<path d="M8.47 4.22c-.3.3-.3.77 0 1.06L15.19 12l-6.72 6.72a.75.75 0 1 0 1.06 1.06l7.25-7.25c.3-.3.3-.77 0-1.06L9.53 4.22a.75.75 0 0 0-1.06 0Z"/>',
  'chevron-down':
    '<path d="M4.22 8.47c.3-.3.77-.3 1.06 0L12 15.19l6.72-6.72a.75.75 0 1 1 1.06 1.06l-7.25 7.25c-.3.3-.77.3-1.06 0L4.22 9.53a.75.75 0 0 1 0-1.06Z"/>',
  eye:
    '<path d="M12 9a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 1.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm0-5a10 10 0 0 1 9.7 7.56.75.75 0 1 1-1.45.37 8.5 8.5 0 0 0-16.5 0 .75.75 0 0 1-1.45-.36A10 10 0 0 1 12 5.5Z"/>',
  'eye-off':
    '<path d="M2.22 2.22a.75.75 0 0 0-.07.98l.07.08 4.03 4.03a9.99 9.99 0 0 0-3.95 5.75.75.75 0 0 0 1.45.37 8.49 8.49 0 0 1 3.58-5.04l1.81 1.81A3.99 3.99 0 0 0 12 17c1.09 0 2.08-.43 2.8-1.14l5.92 5.92a.75.75 0 0 0 1.13-.98l-.07-.08-6.11-6.11-1.2-1.2-2.87-2.87-2.88-2.88-1.13-1.13-4.31-4.31a.75.75 0 0 0-1.06 0Zm7.98 9.05 3.54 3.53A2.5 2.5 0 0 1 9.5 13c0-.67.27-1.28.7-1.73ZM12 5.5a10 10 0 0 0-2.89.42l1.24 1.24a8.52 8.52 0 0 1 9.9 6.27.75.75 0 0 0 1.45-.36A10 10 0 0 0 12 5.5Zm.2 3.5 3.8 3.81a4 4 0 0 0-3.8-3.8Z"/>',
};

@Component({
  selector: 'ui-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="ui-icon" [style.width.px]="size()" [style.height.px]="size()" [innerHTML]="svg()"></span>`,
  styles: `
    :host { display: inline-flex; line-height: 0; color: inherit; }
    .ui-icon { display: inline-flex; align-items: center; justify-content: center; }
    .ui-icon ::ng-deep svg { display: block; width: 100%; height: 100%; fill: currentColor; }
  `,
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input(20);

  readonly #sanitizer = inject(DomSanitizer);
  readonly svg = computed<SafeHtml>(() => {
    const paths = REGISTRY[this.name()] ?? REGISTRY['info'];
    return this.#sanitizer.bypassSecurityTrustHtml(
      `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${paths}</svg>`,
    );
  });
}
