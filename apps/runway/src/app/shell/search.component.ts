import { Component, ChangeDetectionStrategy, computed, inject, signal, viewChild, ElementRef } from '@angular/core';
import { RuntimeService } from '../runtime/runtime.service';
import { ShellService } from './shell.service';
import { IconComponent, type IconName } from '../shared/icon.component';
import { maskPersonal } from '../domain/data-dictionary';
import { READINESS_STATE_LABEL } from '../domain/model';

interface Hit {
  key: string;
  kind: 'case' | 'action';
  typeLabel: string;
  icon: IconName;
  title: string;
  sub: string;
  caseRef: string;
  actionId?: string;
}

const ACTION_ICON: Record<string, IconName> = { approval: 'check-circle', decision: 'split', 'human-task': 'person', triage: 'alert-urgent' };

/** Global search in the command bar — cases + open actions, keyboard-navigable. */
@Component({
  selector: 'rw-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="search" [class.open]="showFlyout()">
      <div class="field">
        <rw-icon name="search" [size]="16" />
        <input #input type="text" [value]="query()" (input)="onInput($event)" (keydown)="onKey($event)"
               (focus)="focused.set(true)" (blur)="onBlur()"
               placeholder="Search cases, joiners, actions" aria-label="Search"
               role="combobox" [attr.aria-expanded]="showFlyout()" />
        @if (query()) {
          <button type="button" class="clear" (mousedown)="$event.preventDefault()" (click)="clear()" aria-label="Clear search">
            <rw-icon name="dismiss" [size]="14" />
          </button>
        }
      </div>

      @if (showFlyout()) {
        <div class="flyout" role="listbox">
          @if (hits().length === 0) {
            <div class="empty">No matches for “{{ query() }}”</div>
          } @else {
            @for (h of hits(); track h.key; let i = $index) {
              <button type="button" class="hit" role="option" [class.active]="i === active()"
                      (mousedown)="$event.preventDefault()" (click)="open(h)" (mouseenter)="active.set(i)">
                <span class="hit-ico" [attr.data-kind]="h.kind"><rw-icon [name]="h.icon" [size]="16" /></span>
                <span class="hit-body">
                  <span class="hit-title">{{ h.title }}</span>
                  <span class="hit-sub">{{ h.sub }}</span>
                </span>
                <span class="hit-type">{{ h.typeLabel }}</span>
              </button>
            }
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; width: 100%; }
    .search { position: relative; }
    .field {
      display: flex; align-items: center; gap: var(--s-8); height: 32px; padding: 0 var(--s-8) 0 var(--s-12);
      background: var(--chrome-search-bg); border-radius: var(--radius-sm); color: var(--chrome-search-placeholder);
      transition: background 0.12s ease, color 0.12s ease, box-shadow 0.12s ease;
    }
    .search.open .field, .field:focus-within { background: #fff; color: var(--muted); box-shadow: var(--shadow-8); }
    .field input { flex: 1; min-width: 0; border: none; background: transparent; outline: none; font: inherit; font-size: var(--fs-300); color: inherit; }
    .field:focus-within input, .search.open .field input { color: var(--text); }
    .field input::placeholder { color: inherit; }
    .clear { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border: none; background: transparent; color: var(--faint); border-radius: var(--radius-sm); cursor: pointer; }
    .clear:hover { background: var(--surface-3); color: var(--muted); }

    .flyout {
      position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 60;
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
      box-shadow: var(--shadow-28); padding: var(--s-4); max-height: 60vh; overflow-y: auto;
    }
    .empty { padding: var(--s-16); text-align: center; color: var(--muted); font-size: var(--fs-200); }
    .hit {
      display: flex; align-items: center; gap: var(--s-10); width: 100%; text-align: left;
      padding: var(--s-8) var(--s-10); border: none; background: transparent; border-radius: var(--radius);
      cursor: pointer; font: inherit; color: var(--text);
    }
    .hit.active { background: var(--accent-weak); }
    .hit-ico { flex: none; display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: var(--radius); background: var(--surface-3); color: var(--muted); }
    .hit-ico[data-kind="case"] { background: var(--accent-weak); color: var(--accent); }
    .hit-ico[data-kind="action"] { background: var(--warn-weak); color: var(--warn); }
    .hit-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .hit-title { font-size: var(--fs-300); font-weight: var(--fw-semibold); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .hit-sub { font-size: var(--fs-200); color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .hit-type { flex: none; font-size: var(--fs-100); text-transform: uppercase; letter-spacing: 0.05em; font-weight: var(--fw-bold); color: var(--faint); }
  `,
})
export class SearchComponent {
  readonly #rt = inject(RuntimeService);
  readonly #shell = inject(ShellService);
  readonly input = viewChild<ElementRef<HTMLInputElement>>('input');

  readonly query = signal('');
  readonly focused = signal(false);
  readonly active = signal(0);

  readonly hits = computed<Hit[]>(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return [];
    const pii = this.#rt.piiAuthorized();
    const terms = q.split(/\s+/);
    const match = (hay: string) => terms.every((t) => hay.includes(t));

    const cases: Hit[] = this.#rt.cases()
      .filter((c) => match([c.caseRef, c.joinerName, c.role, c.location, c.pathway, READINESS_STATE_LABEL[c.state]].join(' ').toLowerCase()))
      .slice(0, 6)
      .map((c) => ({
        key: `c-${c.caseRef}`, kind: 'case', typeLabel: 'Case',
        icon: c.pathway === 'project-level' ? 'branch' : 'cases',
        title: maskPersonal(c.joinerName, pii),
        sub: `${c.caseRef} · ${c.role} · ${READINESS_STATE_LABEL[c.state]}`,
        caseRef: c.caseRef,
      }));

    const actions: Hit[] = this.#rt.openActions()
      .filter((a) => match([a.caseRef, a.title, a.reason, a.kind].join(' ').toLowerCase()))
      .slice(0, 4)
      .map((a) => ({
        key: `a-${a.id}`, kind: 'action', typeLabel: 'Action',
        icon: ACTION_ICON[a.kind] ?? 'alert',
        title: a.title,
        sub: `${a.caseRef} · needs a person`,
        caseRef: a.caseRef, actionId: a.id,
      }));

    return [...cases, ...actions].slice(0, 8);
  });

  readonly showFlyout = computed(() => this.focused() && this.query().trim().length > 0);

  onInput(ev: Event): void {
    this.query.set((ev.target as HTMLInputElement).value);
    this.active.set(0);
  }

  onKey(ev: KeyboardEvent): void {
    const n = this.hits().length;
    if (ev.key === 'Escape') { this.clear(); this.input()?.nativeElement.blur(); return; }
    if (!this.showFlyout() || n === 0) return;
    if (ev.key === 'ArrowDown') { ev.preventDefault(); this.active.update((i) => (i + 1) % n); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); this.active.update((i) => (i - 1 + n) % n); }
    else if (ev.key === 'Enter') { ev.preventDefault(); const h = this.hits()[this.active()]; if (h) this.open(h); }
  }

  onBlur(): void {
    // Delay so a click on a result registers before the flyout closes.
    setTimeout(() => this.focused.set(false), 120);
  }

  open(h: Hit): void {
    if (h.kind === 'case') this.#shell.openCase(h.caseRef);
    else if (h.actionId) this.#shell.openAction(h.actionId);
    this.clear();
    this.focused.set(false);
    this.input()?.nativeElement.blur();
  }

  clear(): void {
    this.query.set('');
    this.active.set(0);
  }
}
