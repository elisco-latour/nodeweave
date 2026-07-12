import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter, map } from 'rxjs';
import { RuntimeService } from '../runtime/runtime.service';
import { loadJson, saveJson } from '../runtime/persist';
import { IntakeWizardComponent } from '../shell/intake-wizard.component';
import { StateChipComponent, stateTone } from '../shared/state-chip.component';
import { IconComponent } from '../shared/icon.component';
import { maskPersonal } from '../domain/data-dictionary';
import { READINESS_STATE_LABEL, type ReadinessRecord } from '../domain/model';
import { queryCases, countByFilter, FILTERS, SORTS, type FilterId, type SortId } from './case-query';

type ViewMode = 'list' | 'table';
const TABLE_PAGE = 25;
const LIST_PAGE = 50;

function csvCell(v: unknown): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Cases surface: command bar + List (master-detail) / Table views over a server-style paged query. */
@Component({
  selector: 'rw-cases',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IntakeWizardComponent, StateChipComponent, IconComponent],
  template: `
    <div class="surface" [class.mode-list]="view() === 'list'" [class.mode-table]="view() === 'table'" [class.has-detail]="!!activeRef()">
      <div class="cmdbar">
        <button type="button" class="btn primary" (click)="wizardOpen.set(true)"><rw-icon name="add" [size]="16" />New case</button>
        <span class="divider"></span>
        <button type="button" class="cmd" (click)="refresh()"><rw-icon name="refresh" [size]="17" [class.spin]="refreshing()" />Refresh</button>
        <button type="button" class="cmd" (click)="exportCsv()"><rw-icon name="download" [size]="17" />Export</button>
        <label class="qsearch">
          <rw-icon name="search" [size]="15" />
          <input type="text" [value]="search()" (input)="onSearch($event)" placeholder="Filter this list" aria-label="Filter cases" />
        </label>

        <span class="grow"></span>

        <div class="toggle" role="tablist" aria-label="View">
          <button type="button" role="tab" [class.on]="view() === 'list'" (click)="setView('list')" title="List view"><rw-icon name="list" [size]="16" /><span>List</span></button>
          <button type="button" role="tab" [class.on]="view() === 'table'" (click)="setView('table')" title="Table view"><rw-icon name="table" [size]="16" /><span>Table</span></button>
        </div>
        <label class="picker">
          <rw-icon name="sort" [size]="16" />
          <select [value]="sort()" (change)="setSort($any($event.target).value)" aria-label="Sort cases">
            @for (s of sorts; track s.id) { <option [value]="s.id">{{ s.label }}</option> }
          </select>
        </label>
        <label class="picker">
          <rw-icon name="filter" [size]="16" />
          <select [value]="filterId()" (change)="setFilter($any($event.target).value)" aria-label="Filter cases">
            @for (f of filters; track f.id) { <option [value]="f.id">{{ f.label }} ({{ counts()[f.id] }})</option> }
          </select>
        </label>
      </div>

      <div class="body">
        <!-- Master: list (list view) or table (table view) -->
        @if (view() === 'list') {
          <aside class="list">
            @for (c of listResult().rows; track c.caseRef) {
              <a class="row" [routerLink]="['/cases', c.caseRef]" routerLinkActive="sel">
                <span class="pw" [attr.data-pw]="c.pathway"><rw-icon [name]="c.pathway === 'project-level' ? 'branch' : 'cases'" [size]="16" /></span>
                <span class="rbody">
                  <span class="r1">
                    <span class="joiner">{{ name(c) }}</span>
                    <rw-chip [label]="label(c)" [tone]="tone(c)" />
                  </span>
                  <span class="r2">
                    <span class="ref">{{ c.caseRef }}</span>
                    <span class="dot">·</span>
                    <span>{{ c.pathway === 'project-level' ? 'Project' : 'Centre' }}</span>
                    <span class="grow"></span>
                    <span class="mini"><span class="mini-fill" [style.width.%]="pct(c)"></span></span>
                    <span class="pct">{{ pct(c) }}%</span>
                  </span>
                </span>
              </a>
            } @empty {
              <div class="empty"><rw-icon name="check-circle" [size]="26" /><p>No cases match.</p></div>
            }
            @if (listResult().matched > listResult().rows.length) {
              <button type="button" class="loadmore" (click)="loadMore()">Load {{ listRemaining() }} more</button>
            }
          </aside>
        } @else {
          <div class="tablewrap">
            <div class="tscroll">
              <table>
                <thead>
                  <tr>
                    <th class="sortable" (click)="setSort('name')">Joiner @if (sort() === 'name') { <rw-icon name="chevron-down" [size]="13" /> }</th>
                    <th>Case</th>
                    <th>Role</th>
                    <th>Pathway</th>
                    <th>State</th>
                    <th class="sortable" (click)="setSort('readiness')">Readiness @if (sort() === 'readiness') { <rw-icon name="chevron-down" [size]="13" /> }</th>
                    <th class="sortable" (click)="setSort('deadline')">Ready by @if (sort() === 'deadline') { <rw-icon name="chevron-down" [size]="13" /> }</th>
                    <th>Owner</th>
                  </tr>
                </thead>
                <tbody>
                  @for (c of tableResult().rows; track c.caseRef) {
                    <tr (click)="open(c.caseRef)">
                      <td class="name">{{ name(c) }}</td>
                      <td class="mono">{{ c.caseRef }}</td>
                      <td>{{ c.role }}</td>
                      <td>{{ c.pathway === 'project-level' ? 'Project' : 'Centre' }}</td>
                      <td><rw-chip [label]="label(c)" [tone]="tone(c)" /></td>
                      <td><span class="rcell"><span class="mini"><span class="mini-fill" [style.width.%]="pct(c)"></span></span>{{ pct(c) }}%</span></td>
                      <td class="mono">{{ c.readinessDeadline }}</td>
                      <td>{{ c.owners.current || '—' }}</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="8" class="tempty">No cases match this filter.</td></tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="pager">
              <span class="range">{{ rangeFrom() }}–{{ rangeTo() }} of {{ tableResult().matched }}</span>
              <span class="grow"></span>
              <button type="button" class="pbtn" [disabled]="tableResult().page === 0" (click)="prevPage()"><rw-icon name="chevron-right" [size]="16" class="flip" /></button>
              <span class="pnum">{{ tableResult().page + 1 }} / {{ tableResult().pageCount }}</span>
              <button type="button" class="pbtn" [disabled]="tableResult().page >= tableResult().pageCount - 1" (click)="nextPage()"><rw-icon name="chevron-right" [size]="16" /></button>
            </div>
          </div>
        }

        <!-- Detail pane (always hosts the child outlet to avoid activation races) -->
        <div class="pane">
          @if (view() === 'list' && !activeRef()) {
            <div class="prompt">
              <rw-icon name="cases" [size]="30" />
              <p>Select a case, or create one.</p>
              <button type="button" class="btn primary" (click)="wizardOpen.set(true)"><rw-icon name="add" [size]="16" />New case</button>
            </div>
          }
          <router-outlet />
        </div>
      </div>
    </div>

    @if (wizardOpen()) {
      <rw-intake-wizard (close)="wizardOpen.set(false)" (created)="onCreated($event)" />
    }
  `,
  styles: `
    :host { display: block; height: 100%; min-height: 0; }
    .surface { display: flex; flex-direction: column; height: 100%; min-height: 0; background: var(--surface); }

    .cmdbar { flex: none; display: flex; align-items: center; gap: var(--s-4); min-height: 48px; padding: var(--s-6) var(--s-16); border-bottom: 1px solid var(--border); flex-wrap: wrap; }
    .divider { width: 1px; height: 20px; background: var(--border); margin: 0 var(--s-8); }
    .grow { flex: 1; }
    .btn { display: inline-flex; align-items: center; gap: var(--s-6); height: 32px; padding: 0 var(--s-12); border: 1px solid transparent; border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-300); font-weight: var(--fw-semibold); cursor: pointer; box-shadow: none; }
    .btn.primary { background: var(--brand); color: #fff; }
    .btn.primary:hover { background: var(--brand-hover); }
    .cmd { display: inline-flex; align-items: center; gap: var(--s-6); height: 32px; padding: 0 var(--s-10); border: none; background: transparent; color: var(--muted); border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-200); font-weight: var(--fw-semibold); cursor: pointer; }
    .cmd:hover { background: var(--surface-3); color: var(--text); }
    .cmd rw-icon { color: var(--faint); }
    .cmd:hover rw-icon { color: var(--accent); }
    .spin { animation: rw-spin 0.6s ease; }

    .qsearch { display: inline-flex; align-items: center; gap: var(--s-6); height: 32px; padding: 0 var(--s-8); border: 1px solid var(--border-strong); border-radius: var(--radius-sm); color: var(--faint); margin-left: var(--s-4); }
    .qsearch:focus-within { border-color: var(--brand); box-shadow: 0 0 0 3px var(--accent-weak-2); }
    .qsearch input { border: none; outline: none; background: transparent; font: inherit; font-size: var(--fs-200); color: var(--text); width: 140px; }

    .toggle { display: inline-flex; background: var(--surface-3); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 2px; }
    .toggle button { display: inline-flex; align-items: center; gap: var(--s-6); height: 26px; padding: 0 var(--s-10); border: none; background: transparent; color: var(--muted); border-radius: 3px; font: inherit; font-size: var(--fs-200); font-weight: var(--fw-semibold); cursor: pointer; }
    .toggle button.on { background: var(--surface); color: var(--accent); box-shadow: var(--shadow-2); }

    .picker { display: inline-flex; align-items: center; gap: var(--s-4); height: 32px; padding: 0 var(--s-6); border-radius: var(--radius-sm); color: var(--faint); }
    .picker:hover { background: var(--surface-3); }
    .picker select { border: none; background: transparent; font: inherit; font-size: var(--fs-200); font-weight: var(--fw-semibold); color: var(--muted); cursor: pointer; padding: var(--s-2); }
    .picker select:focus { outline: none; }

    /* ── Body layout ─────────────────────────────────────────────────────── */
    .body { flex: 1; min-height: 0; }
    .mode-list .body { display: grid; grid-template-columns: 340px 1fr; }
    .mode-table .body { display: block; }
    .mode-table .tablewrap, .mode-table .pane { height: 100%; }
    .mode-table:not(.has-detail) .pane { display: none; }
    .mode-table.has-detail .tablewrap { display: none; }

    /* ── List (master) ───────────────────────────────────────────────────── */
    .list { border-right: 1px solid var(--border); background: var(--surface); overflow-y: auto; padding: var(--s-8); min-height: 0; }
    .row { position: relative; display: flex; align-items: flex-start; gap: var(--s-10); width: 100%; text-align: left; background: transparent; border: 1px solid transparent; border-radius: var(--radius); padding: var(--s-10); cursor: pointer; margin-bottom: 2px; font: inherit; text-decoration: none; transition: background 0.1s ease; }
    .row:hover { background: var(--surface-3); }
    .row.sel { background: var(--accent-weak); border-color: var(--accent-border); }
    .row.sel::before { content: ''; position: absolute; left: 0; top: 10px; bottom: 10px; width: 3px; background: var(--brand); border-radius: var(--radius-pill); }
    .pw { display: inline-grid; place-items: center; width: 30px; height: 30px; flex: none; border-radius: var(--radius); background: var(--surface-3); color: var(--muted); margin-top: 1px; }
    .row.sel .pw { background: #fff; color: var(--accent); }
    .pw[data-pw="project-level"] { color: var(--info); }
    .rbody { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: var(--s-4); }
    .r1 { display: flex; align-items: center; justify-content: space-between; gap: var(--s-8); }
    .joiner { font-size: var(--fs-300); font-weight: var(--fw-semibold); color: var(--text); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .r2 { display: flex; align-items: center; gap: var(--s-6); font-size: var(--fs-200); color: var(--muted); }
    .r2 .ref { font-weight: var(--fw-semibold); }
    .r2 .dot { color: var(--faint); }
    .r2 .grow { flex: 1; }
    .mini { width: 46px; height: 4px; border-radius: var(--radius-pill); background: var(--idle-weak); overflow: hidden; flex: none; }
    .mini-fill { display: block; height: 100%; background: var(--ok); border-radius: var(--radius-pill); }
    .pct { color: var(--faint); font-variant-numeric: tabular-nums; min-width: 30px; text-align: right; }
    .empty { text-align: center; color: var(--faint); padding: 48px 16px; }
    .empty rw-icon { color: var(--idle); }
    .empty p { margin: var(--s-8) 0 0; font-size: var(--fs-200); }
    .loadmore { width: 100%; margin-top: var(--s-6); padding: var(--s-8); border: 1px dashed var(--border-strong); background: transparent; color: var(--accent); border-radius: var(--radius); font: inherit; font-size: var(--fs-200); font-weight: var(--fw-semibold); cursor: pointer; }
    .loadmore:hover { background: var(--surface-3); }

    /* ── Table ───────────────────────────────────────────────────────────── */
    .tablewrap { display: flex; flex-direction: column; min-height: 0; background: var(--surface); }
    .tscroll { flex: 1; overflow: auto; min-height: 0; }
    table { width: 100%; border-collapse: collapse; font-size: var(--fs-300); }
    thead th { position: sticky; top: 0; z-index: 1; background: var(--surface-2); text-align: left; font-size: var(--fs-100); text-transform: uppercase; letter-spacing: 0.05em; color: var(--faint); font-weight: var(--fw-bold); padding: var(--s-8) var(--s-12); border-bottom: 1px solid var(--border); white-space: nowrap; }
    thead th.sortable { cursor: pointer; }
    thead th.sortable:hover { color: var(--accent); }
    thead th rw-icon { vertical-align: middle; margin-left: 2px; color: var(--accent); }
    tbody tr { cursor: pointer; border-bottom: 1px solid var(--border); }
    tbody tr:hover { background: var(--surface-3); }
    tbody td { padding: var(--s-10) var(--s-12); color: var(--muted); white-space: nowrap; }
    tbody td.name { font-weight: var(--fw-semibold); color: var(--text); }
    tbody td.mono { font-family: var(--font-mono); font-size: var(--fs-200); color: var(--faint); }
    .rcell { display: inline-flex; align-items: center; gap: var(--s-6); font-variant-numeric: tabular-nums; }
    .tempty { text-align: center; color: var(--faint); padding: 40px; white-space: normal; }
    .pager { flex: none; display: flex; align-items: center; gap: var(--s-8); padding: var(--s-8) var(--s-16); border-top: 1px solid var(--border); font-size: var(--fs-200); color: var(--muted); }
    .pager .range { font-variant-numeric: tabular-nums; }
    .pnum { font-variant-numeric: tabular-nums; font-weight: var(--fw-semibold); color: var(--text); }
    .pbtn { display: inline-grid; place-items: center; width: 28px; height: 28px; border: 1px solid var(--border-strong); background: var(--surface); color: var(--muted); border-radius: var(--radius-sm); cursor: pointer; }
    .pbtn:hover:not(:disabled) { background: var(--surface-3); color: var(--accent); }
    .pbtn:disabled { opacity: 0.4; cursor: default; }
    .flip { transform: rotate(180deg); }

    /* ── Detail pane ─────────────────────────────────────────────────────── */
    .pane { min-width: 0; overflow: hidden; display: flex; flex-direction: column; background: var(--bg); position: relative; }
    .pane rw-case-detail-page { flex: 1; min-height: 0; }
    .prompt { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--s-12); color: var(--muted); }
    .prompt rw-icon { color: var(--idle); }
    .prompt p { margin: 0; }

    @keyframes rw-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
  `,
})
export class CasesComponent {
  readonly #rt = inject(RuntimeService);
  readonly #router = inject(Router);
  readonly filters = FILTERS;
  readonly sorts = SORTS;

  readonly view = signal<ViewMode>(loadJson<ViewMode>('casesView', 'list'));
  readonly filterId = signal<FilterId>('all');
  readonly sort = signal<SortId>('deadline');
  readonly search = signal('');
  readonly page = signal(0);
  readonly listLimit = signal(LIST_PAGE);
  readonly wizardOpen = signal(false);
  readonly refreshing = signal(false);

  readonly #cases = computed(() => this.#rt.cases());
  readonly counts = computed(() => countByFilter(this.#cases()));
  readonly tableResult = computed(() =>
    queryCases(this.#cases(), { search: this.search(), filter: this.filterId(), sort: this.sort(), page: this.page(), pageSize: TABLE_PAGE }));
  readonly listResult = computed(() =>
    queryCases(this.#cases(), { search: this.search(), filter: this.filterId(), sort: this.sort(), page: 0, pageSize: this.listLimit() }));
  readonly listRemaining = computed(() => this.listResult().matched - this.listResult().rows.length);
  readonly rangeFrom = computed(() => (this.tableResult().matched === 0 ? 0 : this.tableResult().page * TABLE_PAGE + 1));
  readonly rangeTo = computed(() => Math.min((this.tableResult().page + 1) * TABLE_PAGE, this.tableResult().matched));

  readonly #url = toSignal(
    this.#router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.#router.url)),
    { initialValue: this.#router.url },
  );
  readonly activeRef = computed(() => {
    const m = this.#url().match(/\/cases\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  });

  setView(v: ViewMode): void { this.view.set(v); saveJson('casesView', v); }
  setFilter(f: FilterId): void { this.filterId.set(f); this.#resetPaging(); }
  setSort(s: SortId): void { this.sort.set(s); this.#resetPaging(); }
  onSearch(ev: Event): void { this.search.set((ev.target as HTMLInputElement).value); this.#resetPaging(); }
  #resetPaging(): void { this.page.set(0); this.listLimit.set(LIST_PAGE); }
  loadMore(): void { this.listLimit.update((n) => n + LIST_PAGE); }
  prevPage(): void { this.page.update((p) => Math.max(0, p - 1)); }
  nextPage(): void { this.page.update((p) => Math.min(this.tableResult().pageCount - 1, p + 1)); }
  open(ref: string): void { this.#router.navigate(['/cases', ref]); }

  name(c: ReadinessRecord): string { return maskPersonal(c.joinerName, this.#rt.piiAuthorized()); }
  label(c: ReadinessRecord): string { return READINESS_STATE_LABEL[c.state]; }
  tone(c: ReadinessRecord) { return stateTone(c.state); }
  pct(c: ReadinessRecord): number { return Math.round(this.#rt.confidence(c) * 100); }

  refresh(): void {
    this.#rt.reload();
    this.refreshing.set(true);
    setTimeout(() => this.refreshing.set(false), 600);
  }

  onCreated(caseRef: string): void {
    this.wizardOpen.set(false);
    this.filterId.set('all');
    this.#resetPaging();
    this.#router.navigate(['/cases', caseRef]);
  }

  exportCsv(): void {
    const pii = this.#rt.piiAuthorized();
    const matched = queryCases(this.#cases(), { search: this.search(), filter: this.filterId(), sort: this.sort(), page: 0, pageSize: Number.MAX_SAFE_INTEGER }).rows;
    const header = ['Case', 'Joiner', 'Role', 'Location', 'Pathway', 'State', 'Readiness %', 'Day 1', 'Ready by'];
    const lines = [header.join(',')];
    for (const c of matched) {
      lines.push([
        c.caseRef, maskPersonal(c.joinerName, pii), c.role, c.location, c.pathway,
        READINESS_STATE_LABEL[c.state], this.pct(c), c.startDate, c.readinessDeadline,
      ].map(csvCell).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `runway-cases-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
