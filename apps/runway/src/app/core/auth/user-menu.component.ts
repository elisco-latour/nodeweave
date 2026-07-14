import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { IconComponent } from '../../shared/icon.component';
import { SessionService } from './session.service';

/** Shell account control — the avatar, with a menu showing the signed-in user and Sign out. */
@Component({
  selector: 'rw-user-menu',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (user(); as u) {
      <button type="button" class="avatar" [class.on]="open()" (click)="toggle()" [title]="u.name" [attr.aria-label]="'Account: ' + u.name">{{ u.initials }}</button>

      @if (open()) {
        <div class="scrim" (click)="close()"></div>
        <div class="menu" role="menu">
          <div class="who">
            <span class="av">{{ u.initials }}</span>
            <div class="id">
              <span class="nm">{{ u.name }}</span>
              <span class="em">{{ u.email }}</span>
            </div>
          </div>
          <div class="meta"><rw-icon name="cases" [size]="14" /><span>{{ u.org }}</span></div>
          <div class="sep"></div>
          <button type="button" class="item" role="menuitem" (click)="signOut()"><rw-icon name="dismiss" [size]="16" />Sign out</button>
        </div>
      }
    }
  `,
  styles: `
    :host { position: relative; display: inline-flex; }
    .avatar { display: inline-grid; place-items: center; width: 32px; height: 32px; margin-left: var(--s-6);
      border: none; border-radius: var(--radius-pill); background: linear-gradient(135deg, var(--acn-40), var(--acn-70));
      color: #fff; font-size: var(--fs-200); font-weight: var(--fw-bold); letter-spacing: 0.02em; cursor: pointer;
      box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.28); }
    .avatar:hover, .avatar.on { box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.6); }

    .scrim { position: fixed; inset: 0; z-index: 90; }
    .menu { position: absolute; top: calc(100% + 8px); right: 0; z-index: 100; width: 260px;
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
      box-shadow: var(--shadow-28); padding: var(--s-8); animation: pop 0.14s ease; }
    .who { display: flex; align-items: center; gap: var(--s-10); padding: var(--s-8) var(--s-8) var(--s-10); }
    .av { display: inline-grid; place-items: center; width: 40px; height: 40px; flex: none; border-radius: var(--radius-pill);
      background: linear-gradient(135deg, var(--acn-40), var(--acn-70)); color: #fff; font-size: var(--fs-300); font-weight: var(--fw-bold); }
    .id { display: flex; flex-direction: column; min-width: 0; }
    .nm { font-size: var(--fs-300); font-weight: var(--fw-semibold); color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .em { font-size: var(--fs-100); color: var(--faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .meta { display: flex; align-items: center; gap: var(--s-6); padding: var(--s-4) var(--s-8) var(--s-8); font-size: var(--fs-200); color: var(--muted); }
    .meta rw-icon { color: var(--faint); }
    .sep { height: 1px; background: var(--border); margin: var(--s-4) 0; }
    .item { display: flex; align-items: center; gap: var(--s-8); width: 100%; text-align: left; padding: var(--s-8) var(--s-8);
      border: none; background: transparent; color: var(--text); border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-300); cursor: pointer; }
    .item:hover { background: var(--surface-3); color: var(--danger); }
    .item rw-icon { color: var(--faint); }
    .item:hover rw-icon { color: var(--danger); }

    @keyframes pop { from { opacity: 0; transform: translateY(-4px); } }
  `,
})
export class UserMenuComponent {
  readonly #session = inject(SessionService);
  readonly user = this.#session.user;
  readonly open = signal(false);

  toggle(): void { this.open.update((v) => !v); }
  close(): void { this.open.set(false); }
  signOut(): void { this.close(); void this.#session.logout(); }
}
