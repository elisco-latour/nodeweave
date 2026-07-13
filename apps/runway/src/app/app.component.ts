import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { RuntimeService } from './runtime/runtime.service';
import { IconComponent, type IconName } from './shared/icon.component';
import { SearchComponent } from './shell/search.component';
import { TourComponent } from './shell/tour.component';
import { TourService } from './shell/tour.service';
import { NotificationsComponent } from './features/notifications';
import { ThemeService } from './shell/theme.service';
import type { View } from './shell/shell.service';

interface NavItem { id: View; label: string; icon: IconName; iconActive: IconName; }

const NAV: NavItem[] = [
  { id: 'home', label: 'Home', icon: 'home', iconActive: 'home-filled' },
  { id: 'inbox', label: 'Inbox', icon: 'inbox', iconActive: 'inbox-filled' },
  { id: 'cases', label: 'Cases', icon: 'cases', iconActive: 'cases-filled' },
  { id: 'compose', label: 'Compose', icon: 'compose', iconActive: 'compose-filled' },
];

@Component({
  selector: 'rw-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, SearchComponent, TourComponent, NotificationsComponent],
  template: `
    <!-- Command bar -->
    <header class="chrome">
      <div class="chrome-left">
        <button type="button" class="icon-btn" (click)="collapsed.set(!collapsed())"
                [attr.aria-label]="collapsed() ? 'Expand navigation' : 'Collapse navigation'" title="Toggle navigation">
          <rw-icon name="menu" [size]="20" />
        </button>
        <a class="brand" routerLink="/home">
          <span class="brand-mark"><rw-icon name="brand" [size]="20" /></span>
          <span class="brand-name">Runway</span>
          <span class="brand-tagline">Onboarding readiness</span>
        </a>
      </div>

      <div class="chrome-search"><rw-search /></div>

      <div class="chrome-right">
        <button type="button" class="pii" [class.on]="rt.piiAuthorized()" (click)="rt.togglePii()"
                title="Personal data is masked by classification until an authorized viewer reveals it">
          <rw-icon [name]="rt.piiAuthorized() ? 'eye-off' : 'eye'" [size]="18" />
          <span>{{ rt.piiAuthorized() ? 'Hide PII' : 'Reveal PII' }}</span>
        </button>
        <rw-notifications />
        <a class="icon-btn" routerLink="/settings" routerLinkActive="on" title="Settings" aria-label="Settings"><rw-icon name="settings" [size]="20" /></a>
        <a class="icon-btn" routerLink="/help" routerLinkActive="on" title="Help" aria-label="Help"><rw-icon name="help" [size]="20" /></a>
        <button type="button" class="icon-btn" title="Apps" aria-label="Apps"><rw-icon name="waffle" [size]="20" /></button>
        <span class="avatar" title="PPSO Operations" aria-hidden="true">NR</span>
      </div>
    </header>

    <div class="shell">
      <!-- Navigation rail -->
      <nav class="rail" [class.collapsed]="collapsed()">
        <ul class="nav">
          @for (item of nav; track item.id) {
            <li>
              <a class="nav-item" [routerLink]="'/' + item.id" routerLinkActive="active" #rla="routerLinkActive" [title]="item.label">
                <span class="nav-ico"><rw-icon [name]="rla.isActive ? item.iconActive : item.icon" [size]="20" /></span>
                <span class="nav-label">{{ item.label }}</span>
                @if (item.id === 'inbox' && openCount() > 0) {
                  <span class="badge" [class.dot]="collapsed()">{{ collapsed() ? '' : openCount() }}</span>
                }
              </a>
            </li>
          }
        </ul>
        <div class="rail-foot">
          <button type="button" class="tour-btn" (click)="tour.start()" title="Take the guided tour">
            <rw-icon name="play" [size]="18" /><span class="nav-label">Guided tour</span>
          </button>
          <span class="runtime"><span class="pulse"></span><span class="nav-label">Mock runtime</span></span>
        </div>
      </nav>

      <!-- Content -->
      <main><router-outlet /></main>
    </div>

    <rw-tour />
  `,
  styles: `
    :host { display: grid; grid-template-rows: var(--chrome-h) 1fr; height: 100vh; overflow: hidden; }

    /* ── Command bar ─────────────────────────────────────────────────────── */
    .chrome {
      display: grid; grid-template-columns: 1fr minmax(0, 520px) 1fr; align-items: center;
      gap: var(--s-16); padding: 0 var(--s-12) 0 var(--s-8);
      background: linear-gradient(100deg, var(--chrome-bg) 0%, var(--chrome-bg-2) 100%);
      color: var(--chrome-fg); z-index: 20;
    }
    .chrome-left { display: flex; align-items: center; gap: var(--s-4); min-width: 0; }
    .brand { display: flex; align-items: baseline; gap: var(--s-8); padding-left: var(--s-4); min-width: 0; text-decoration: none; color: inherit; }
    .brand-mark { display: inline-flex; align-self: center; color: #fff; }
    .brand-name { font-family: var(--font-display); font-weight: var(--fw-bold); font-size: var(--fs-400); letter-spacing: -0.01em; }
    .brand-tagline { font-size: var(--fs-200); color: var(--chrome-fg-muted); white-space: nowrap; }

    .chrome-search { min-width: 0; }

    .chrome-right { display: flex; align-items: center; justify-content: flex-end; gap: var(--s-4); }
    .icon-btn {
      display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px;
      border: none; background: transparent; color: var(--chrome-fg-muted); border-radius: var(--radius-sm);
      cursor: pointer; transition: background 0.1s ease, color 0.1s ease; text-decoration: none;
    }
    .icon-btn:hover { background: var(--chrome-hover); color: #fff; }
    .icon-btn:active { background: var(--chrome-pressed); }
    .icon-btn.on { background: var(--chrome-pressed); color: #fff; }

    .pii {
      display: inline-flex; align-items: center; gap: var(--s-6); height: 32px; padding: 0 var(--s-10);
      border: 1px solid transparent; background: var(--chrome-hover); color: #fff; border-radius: var(--radius-sm);
      font: inherit; font-size: var(--fs-200); font-weight: var(--fw-semibold); cursor: pointer; margin-right: var(--s-4);
      transition: background 0.1s ease;
    }
    .pii:hover { background: var(--chrome-pressed); }
    .pii.on { background: #fff; color: var(--acn-90); }

    .avatar {
      display: inline-grid; place-items: center; width: 32px; height: 32px; margin-left: var(--s-6);
      border-radius: var(--radius-pill); background: linear-gradient(135deg, var(--acn-40), var(--acn-70));
      color: #fff; font-size: var(--fs-200); font-weight: var(--fw-bold); letter-spacing: 0.02em;
      box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.28);
    }

    /* ── Shell (rail + content) ──────────────────────────────────────────── */
    .shell { display: grid; grid-template-columns: var(--rail-w) 1fr; min-height: 0; }
    .rail {
      display: flex; flex-direction: column; background: var(--rail-bg);
      border-right: 1px solid var(--border); padding: var(--s-8) var(--s-8) var(--s-12);
      transition: width 0.14s ease; overflow: hidden;
    }
    .rail.collapsed { width: var(--rail-w-collapsed); }
    .shell:has(.rail.collapsed) { grid-template-columns: var(--rail-w-collapsed) 1fr; }

    .nav { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
    .nav-item {
      position: relative; display: flex; align-items: center; gap: var(--s-12); width: 100%; height: 40px;
      padding: 0 var(--s-12); border: none; background: transparent; color: var(--muted);
      border-radius: var(--radius); font: inherit; font-size: var(--fs-300); cursor: pointer; text-align: left;
      text-decoration: none; transition: background 0.1s ease, color 0.1s ease;
    }
    .nav-item:hover { background: var(--surface-3); color: var(--text); }
    .nav-item.active { background: var(--accent-weak); color: var(--accent); font-weight: var(--fw-semibold); }
    .nav-item.active::before {
      content: ''; position: absolute; left: 0; top: 9px; bottom: 9px; width: 3px;
      background: var(--brand); border-radius: var(--radius-pill);
    }
    .nav-ico { display: inline-flex; flex: none; }
    .nav-label { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; }
    .rail.collapsed .nav-label { display: none; }
    .rail.collapsed .nav-item { justify-content: center; padding: 0; gap: 0; }

    .badge {
      flex: none; min-width: 20px; height: 20px; padding: 0 var(--s-6); border-radius: var(--radius-pill);
      background: var(--brand); color: var(--brand-fg); font-size: var(--fs-100); font-weight: var(--fw-bold);
      display: inline-flex; align-items: center; justify-content: center;
    }
    .badge.dot { position: absolute; top: 6px; right: 8px; min-width: 8px; width: 8px; height: 8px; padding: 0; }

    .rail-foot { margin-top: auto; display: flex; flex-direction: column; gap: var(--s-4); padding-top: var(--s-8); }
    .tour-btn {
      display: flex; align-items: center; gap: var(--s-12); width: 100%; height: 36px; padding: 0 var(--s-12);
      border: none; background: transparent; color: var(--muted); border-radius: var(--radius); font: inherit;
      font-size: var(--fs-300); cursor: pointer; text-align: left; transition: background 0.1s ease, color 0.1s ease;
    }
    .tour-btn:hover { background: var(--surface-3); color: var(--accent); }
    .rail.collapsed .tour-btn { justify-content: center; padding: 0; gap: 0; }
    .runtime { display: inline-flex; align-items: center; gap: var(--s-12); padding: 0 var(--s-12); height: 24px; font-size: var(--fs-200); color: var(--faint); }
    .pulse { width: 8px; height: 8px; border-radius: 50%; background: var(--ok); box-shadow: 0 0 0 3px var(--ok-weak); flex: none; }
    .rail.collapsed .runtime { justify-content: center; padding: 0; }

    main { min-width: 0; min-height: 0; overflow-y: auto; background: var(--bg); }
  `,
})
export class AppComponent {
  readonly rt = inject(RuntimeService);
  readonly tour = inject(TourService);
  readonly #theme = inject(ThemeService); // instantiate so the saved theme is applied on boot
  readonly collapsed = signal(false);
  readonly nav = NAV;
  readonly openCount = computed(() => this.rt.openActions().length);
}
