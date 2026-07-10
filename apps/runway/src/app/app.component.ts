import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { RuntimeService } from './runtime/runtime.service';
import { InboxComponent } from './operate/inbox.component';
import { CasesComponent } from './operate/cases.component';

type View = 'inbox' | 'cases';

@Component({
  selector: 'rw-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [InboxComponent, CasesComponent],
  template: `
    <header class="topbar">
      <div class="brand">
        <span class="mark">▲</span>
        <span class="name">Runway</span>
        <span class="tagline">Onboarding readiness</span>
      </div>

      <nav class="nav">
        <button type="button" [class.active]="view() === 'inbox'" (click)="view.set('inbox')">
          Inbox
          @if (openCount() > 0) { <span class="badge">{{ openCount() }}</span> }
        </button>
        <button type="button" [class.active]="view() === 'cases'" (click)="view.set('cases')">Cases</button>
        <button type="button" class="soon" disabled title="Process authoring — next">Compose</button>
      </nav>

      <div class="right">
        <button type="button" class="pii" [class.on]="rt.piiAuthorized()" (click)="rt.togglePii()"
                title="Personal data is masked by classification until an authorized viewer reveals it">
          {{ rt.piiAuthorized() ? 'Hide PII' : 'Reveal PII' }}
        </button>
        <span class="mock" title="This build runs on an in-memory mock runtime">mock runtime</span>
      </div>
    </header>

    <main>
      @switch (view()) {
        @case ('inbox') { <rw-inbox></rw-inbox> }
        @case ('cases') { <rw-cases></rw-cases> }
      }
    </main>
  `,
  styles: `
    :host { display: grid; grid-template-rows: auto 1fr; height: 100vh; }
    .topbar { display: flex; align-items: center; gap: 22px; padding: 0 18px; height: 54px; background: var(--surface); border-bottom: 1px solid var(--border); }
    .brand { display: flex; align-items: baseline; gap: 8px; }
    .brand .mark { color: var(--accent); font-size: 0.85rem; }
    .brand .name { font-weight: 700; letter-spacing: -0.01em; }
    .brand .tagline { font-size: 0.76rem; color: var(--faint); }

    .nav { display: flex; gap: 4px; }
    .nav button { position: relative; display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px; border: none; background: transparent; color: var(--muted); border-radius: 8px; font: inherit; font-size: 0.86rem; cursor: pointer; }
    .nav button:hover { background: var(--surface-2); color: var(--text); }
    .nav button.active { background: var(--accent-weak); color: var(--accent); font-weight: 600; }
    .nav .badge { background: var(--accent); color: #fff; font-size: 0.66rem; font-weight: 700; border-radius: 999px; padding: 0 6px; min-width: 16px; text-align: center; }
    .nav .soon { opacity: 0.45; cursor: default; }

    .right { margin-left: auto; display: flex; align-items: center; gap: 12px; }
    .pii { padding: 5px 11px; border: 1px solid var(--border); background: var(--surface); color: var(--muted); border-radius: 8px; font: inherit; font-size: 0.78rem; cursor: pointer; }
    .pii:hover { background: var(--surface-2); }
    .pii.on { background: var(--warn-weak); border-color: #fcd34d; color: #92400e; }
    .mock { font-size: 0.7rem; color: var(--faint); border: 1px dashed var(--border-strong); border-radius: 999px; padding: 2px 9px; }

    main { min-height: 0; overflow-y: auto; }
  `,
})
export class AppComponent {
  readonly rt = inject(RuntimeService);
  readonly view = signal<View>('inbox');
  readonly openCount = computed(() => this.rt.openActions().length);
}
