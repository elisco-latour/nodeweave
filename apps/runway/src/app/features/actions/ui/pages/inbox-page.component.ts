import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs';
import { RuntimeService } from '../../../../runtime/runtime.service';
import { IconComponent, type IconName } from '../../../../shared/icon.component';
import { maskPersonal } from '../../../../domain/data-dictionary';
import type { Action } from '../../domain/action.entity';
import { InboxViewModel } from '../../state/inbox.view-model';
import { KIND_TONE, KIND_ICON, INBOX_SORTS, KIND_FILTERS, actionAgo } from '../action-presentation';

/** Smart page — the Action Inbox master-detail. Binds to InboxViewModel; the list column carries the tabs + sort/filter. */
@Component({
  selector: 'rw-inbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="surface">
      <div class="md">
        <aside class="listcol">
          <div class="lbar">
            <div class="tabs" role="tablist">
              <button type="button" class="tab" role="tab" [class.on]="vm.tab() === 'all'" (click)="vm.tab.set('all')">
                All <span class="n">{{ vm.allCount() }}</span>
              </button>
              <button type="button" class="tab" role="tab" [class.on]="vm.tab() === 'pending'" (click)="vm.tab.set('pending')">
                Pending <span class="n">{{ vm.pendingCount() }}</span>
              </button>
            </div>
            <span class="grow"></span>
            <label class="picker" title="Sort by">
              <rw-icon name="sort" [size]="15" />
              <select [value]="vm.sortBy()" (change)="vm.sortBy.set($any($event.target).value)" aria-label="Sort by">
                @for (s of inboxSorts; track s.id) { <option [value]="s.id">{{ s.label }}</option> }
              </select>
            </label>
            <label class="picker" title="Filter by type">
              <rw-icon name="filter" [size]="15" />
              <select [value]="vm.kindFilter()" (change)="vm.kindFilter.set($any($event.target).value)" aria-label="Filter by type">
                @for (k of kindFilters; track k.id) { <option [value]="k.id">{{ k.label }}</option> }
              </select>
            </label>
          </div>

          <div class="list">
            @for (a of vm.visible(); track a.id) {
              <a class="row" [class.done]="!a.isOpen" [routerLink]="['/inbox', a.id]" routerLinkActive="sel">
                <span class="kind" [attr.data-tone]="tone(a)"><rw-icon [name]="icon(a)" [size]="16" /></span>
                <span class="rbody">
                  <span class="r1">
                    <span class="title">{{ a.title }}</span>
                    @if (!a.isOpen) { <rw-icon name="check" [size]="14" class="donetick" /> }
                  </span>
                  <span class="r2">
                    <span class="ref">{{ a.caseRef }}</span>
                    <span class="dot">·</span>
                    <span class="joiner">{{ joiner(a) }}</span>
                    <span class="grow"></span>
                    <span class="ago">{{ ago(a.createdAt) }}</span>
                  </span>
                </span>
              </a>
            } @empty {
              <div class="empty">
                <rw-icon name="check-circle" [size]="26" />
                <p>{{ vm.tab() === 'pending' ? "No pending items — you're all caught up." : 'No actions match this filter.' }}</p>
              </div>
            }
          </div>
        </aside>

        <div class="pane">
          @if (!activeId()) {
            <div class="prompt">
              <div class="tick"><rw-icon name="check-circle-filled" [size]="30" /></div>
              <p>{{ vm.pendingCount() > 0 ? 'Select an item to review and act on it.' : "You're all caught up — nothing needs a person." }}</p>
            </div>
          }
          <router-outlet />
        </div>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; min-height: 0; }
    .surface { display: flex; flex-direction: column; height: 100%; min-height: 0; background: var(--surface); }
    .md { flex: 1; min-height: 0; display: grid; grid-template-columns: 380px 1fr; }

    .listcol { display: flex; flex-direction: column; min-height: 0; border-right: 1px solid var(--border); }
    .lbar { flex: none; display: flex; align-items: center; gap: var(--s-6); padding: var(--s-8) var(--s-10); border-bottom: 1px solid var(--border); }
    .tabs { display: inline-flex; gap: 2px; }
    .tab { display: inline-flex; align-items: center; gap: var(--s-6); height: 28px; padding: 0 var(--s-10); border: none; background: transparent; color: var(--muted); border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-200); font-weight: var(--fw-semibold); cursor: pointer; }
    .tab:hover { background: var(--surface-3); color: var(--text); }
    .tab.on { background: var(--accent-weak); color: var(--accent); }
    .tab .n { font-size: var(--fs-100); font-weight: var(--fw-bold); background: var(--surface-3); color: var(--muted); border-radius: var(--radius-pill); padding: 0 6px; min-width: 16px; text-align: center; }
    .tab.on .n { background: var(--accent-weak-2); color: var(--accent); }
    .grow { flex: 1; }
    .picker { display: inline-flex; align-items: center; gap: 3px; height: 28px; padding: 0 var(--s-4); border-radius: var(--radius-sm); color: var(--faint); }
    .picker:hover { background: var(--surface-3); }
    .picker select { border: none; background: transparent; font: inherit; font-size: var(--fs-200); font-weight: var(--fw-semibold); color: var(--muted); cursor: pointer; padding: var(--s-2) 0; }
    .picker select:focus { outline: none; }

    .list { flex: 1; overflow-y: auto; padding: var(--s-8); min-height: 0; }
    .row { position: relative; display: flex; align-items: flex-start; gap: var(--s-10); width: 100%; text-align: left; background: transparent; border: 1px solid transparent; border-radius: var(--radius); padding: var(--s-10) var(--s-12); margin-bottom: 2px; text-decoration: none; cursor: pointer; transition: background 0.1s ease; }
    .row:hover { background: var(--surface-3); }
    .row.sel { background: var(--accent-weak); border-color: var(--accent-border); }
    .row.sel::before { content: ''; position: absolute; left: 0; top: 10px; bottom: 10px; width: 3px; background: var(--brand); border-radius: var(--radius-pill); }
    .row.done { opacity: 0.62; }
    .kind { display: inline-grid; place-items: center; width: 30px; height: 30px; flex: none; border-radius: var(--radius); background: var(--tone-weak, var(--surface-3)); color: var(--tone-strong, var(--muted)); margin-top: 1px; }
    .kind[data-tone="accent"] { --tone-weak: var(--accent-weak); --tone-strong: var(--accent); }
    .kind[data-tone="warn"]   { --tone-weak: var(--warn-weak);   --tone-strong: var(--warn); }
    .kind[data-tone="info"]   { --tone-weak: var(--info-weak);   --tone-strong: var(--info); }
    .kind[data-tone="danger"] { --tone-weak: var(--danger-weak); --tone-strong: var(--danger); }
    .rbody { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .r1 { display: flex; align-items: center; gap: var(--s-6); }
    .title { font-size: var(--fs-300); font-weight: var(--fw-semibold); color: var(--text); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .donetick { color: var(--ok); flex: none; }
    .r2 { display: flex; align-items: center; gap: var(--s-6); font-size: var(--fs-200); color: var(--muted); }
    .r2 .ref { font-weight: var(--fw-semibold); }
    .r2 .dot { color: var(--faint); }
    .r2 .joiner { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .r2 .grow { flex: 1; }
    .r2 .ago { color: var(--faint); white-space: nowrap; }
    .empty { text-align: center; color: var(--faint); padding: 48px 16px; }
    .empty rw-icon { color: var(--ok); }
    .empty p { margin: var(--s-8) 0 0; font-size: var(--fs-200); }

    .pane { min-width: 0; overflow: hidden; display: flex; flex-direction: column; background: var(--bg); position: relative; }
    .pane rw-action-detail { flex: 1; min-height: 0; }
    .prompt { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--s-12); color: var(--muted); padding: 24px; text-align: center; }
    .prompt .tick { width: 56px; height: 56px; border-radius: 50%; background: var(--ok-weak); color: var(--ok); display: grid; place-items: center; }
    .prompt p { margin: 0; max-width: 320px; }
  `,
})
export class InboxPageComponent {
  readonly vm = inject(InboxViewModel);
  readonly #rt = inject(RuntimeService); // PII/governance read — cross-cutting; to be extracted into a GovernanceService/port.
  readonly #router = inject(Router);
  readonly inboxSorts = INBOX_SORTS;
  readonly kindFilters = KIND_FILTERS;

  readonly #url = toSignal(
    this.#router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.#router.url)),
    { initialValue: this.#router.url },
  );
  readonly activeId = computed(() => {
    const m = this.#url().match(/\/inbox\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  });

  tone(a: Action) { return KIND_TONE[a.kind]; }
  icon(a: Action): IconName { return KIND_ICON[a.kind]; }
  ago(iso: string): string { return actionAgo(iso); }
  joiner(a: Action): string { return maskPersonal(a.joinerName, this.#rt.piiAuthorized()); }
}
