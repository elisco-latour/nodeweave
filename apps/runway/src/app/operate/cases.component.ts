import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { RuntimeService } from '../runtime/runtime.service';
import { IntakeWizardComponent } from '../shell/intake-wizard.component';
import { StateChipComponent, stateTone } from '../shared/state-chip.component';
import { IconComponent } from '../shared/icon.component';
import { maskPersonal } from '../domain/data-dictionary';
import { READINESS_STATE_LABEL, type ReadinessRecord } from '../domain/model';
import { queryCases, countByFilter, FILTERS, SORTS, type FilterId, type SortId } from './case-query';

const TABLE_PAGE = 25;

function csvCell(v: unknown): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Cases — the readiness registry: a calm header, a command bar, and an elevated, paginated table. */
@Component({
  selector: 'rw-cases',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IntakeWizardComponent, StateChipComponent, IconComponent],
  template: `
    <div class="surface">
      <header class="head">
        <div>
          <h1>Cases</h1>
          <p class="sub">Every onboarding — the canonical readiness record, from intake through to Day 1.</p>
        </div>
        <span class="count">{{ result().matched }} shown · {{ cases().length }} total</span>
      </header>

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

      <div class="tablecard">
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
              @for (c of result().rows; track c.caseRef) {
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
          <span class="range">{{ rangeFrom() }}–{{ rangeTo() }} of {{ result().matched }}</span>
          <span class="grow"></span>
          <button type="button" class="pbtn" [disabled]="result().page === 0" (click)="prevPage()"><rw-icon name="chevron-right" [size]="16" class="flip" /></button>
          <span class="pnum">{{ result().page + 1 }} / {{ result().pageCount }}</span>
          <button type="button" class="pbtn" [disabled]="result().page >= result().pageCount - 1" (click)="nextPage()"><rw-icon name="chevron-right" [size]="16" /></button>
        </div>
      </div>
    </div>

    @if (wizardOpen()) {
      <rw-intake-wizard (close)="wizardOpen.set(false)" (created)="onCreated($event)" />
    }
  `,
  styles: `
    :host { display: block; height: 100%; min-height: 0; }
    .surface { display: flex; flex-direction: column; height: 100%; min-height: 0; background: var(--bg); }

    .head { flex: none; display: flex; align-items: flex-start; justify-content: space-between; padding: var(--s-24) var(--s-24) var(--s-12); }
    h1 { margin: 0; font-family: var(--font-display); font-size: var(--fs-600); font-weight: var(--fw-bold); letter-spacing: -0.02em; }
    .sub { margin: var(--s-4) 0 0; color: var(--muted); font-size: var(--fs-300); }
    .count { font-size: var(--fs-200); color: var(--faint); font-variant-numeric: tabular-nums; white-space: nowrap; margin-top: var(--s-6); }

    .cmdbar { flex: none; display: flex; align-items: center; gap: var(--s-4); padding: 0 var(--s-24) var(--s-12); flex-wrap: wrap; }
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
    .qsearch { display: inline-flex; align-items: center; gap: var(--s-6); height: 32px; padding: 0 var(--s-8); border: 1px solid var(--border-strong); border-radius: var(--radius-sm); color: var(--faint); background: var(--surface); margin-left: var(--s-4); }
    .qsearch:focus-within { border-color: var(--brand); box-shadow: 0 0 0 3px var(--accent-weak-2); }
    .qsearch input { border: none; outline: none; background: transparent; font: inherit; font-size: var(--fs-200); color: var(--text); width: 150px; }
    .picker { display: inline-flex; align-items: center; gap: var(--s-4); height: 32px; padding: 0 var(--s-8); border-radius: var(--radius-sm); color: var(--faint); background: var(--surface); border: 1px solid var(--border); }
    .picker select { border: none; background: transparent; font: inherit; font-size: var(--fs-200); font-weight: var(--fw-semibold); color: var(--muted); cursor: pointer; padding: var(--s-2); }
    .picker select:focus { outline: none; }

    /* Elevated table container floating over the page. */
    .tablecard { flex: 1; min-height: 0; margin: 0 var(--s-24) var(--s-24); display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-4); overflow: hidden; }
    .tscroll { flex: 1; overflow: auto; min-height: 0; }
    table { width: 100%; border-collapse: collapse; font-size: var(--fs-300); }
    thead th { position: sticky; top: 0; z-index: 1; background: var(--surface-2); text-align: left; font-size: var(--fs-100); text-transform: uppercase; letter-spacing: 0.05em; color: var(--faint); font-weight: var(--fw-bold); padding: var(--s-10) var(--s-12); border-bottom: 1px solid var(--border); white-space: nowrap; }
    thead th.sortable { cursor: pointer; }
    thead th.sortable:hover { color: var(--accent); }
    thead th rw-icon { vertical-align: middle; margin-left: 2px; color: var(--accent); }
    tbody tr { cursor: pointer; border-bottom: 1px solid var(--border); }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: var(--surface-3); }
    tbody td { padding: var(--s-10) var(--s-12); color: var(--muted); white-space: nowrap; }
    tbody td.name { font-weight: var(--fw-semibold); color: var(--text); }
    tbody td.mono { font-family: var(--font-mono); font-size: var(--fs-200); color: var(--faint); }
    .rcell { display: inline-flex; align-items: center; gap: var(--s-6); font-variant-numeric: tabular-nums; }
    .mini { width: 46px; height: 4px; border-radius: var(--radius-pill); background: var(--idle-weak); overflow: hidden; }
    .mini-fill { display: block; height: 100%; background: var(--ok); border-radius: var(--radius-pill); }
    .tempty { text-align: center; color: var(--faint); padding: 48px; white-space: normal; }
    .pager { flex: none; display: flex; align-items: center; gap: var(--s-8); padding: var(--s-8) var(--s-16); border-top: 1px solid var(--border); font-size: var(--fs-200); color: var(--muted); background: var(--surface); }
    .range { font-variant-numeric: tabular-nums; }
    .pnum { font-variant-numeric: tabular-nums; font-weight: var(--fw-semibold); color: var(--text); }
    .pbtn { display: inline-grid; place-items: center; width: 28px; height: 28px; border: 1px solid var(--border-strong); background: var(--surface); color: var(--muted); border-radius: var(--radius-sm); cursor: pointer; }
    .pbtn:hover:not(:disabled) { background: var(--surface-3); color: var(--accent); }
    .pbtn:disabled { opacity: 0.4; cursor: default; }
    .flip { transform: rotate(180deg); }

    @keyframes rw-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
  `,
})
export class CasesComponent {
  readonly #rt = inject(RuntimeService);
  readonly #router = inject(Router);
  readonly filters = FILTERS;
  readonly sorts = SORTS;

  readonly filterId = signal<FilterId>('all');
  readonly sort = signal<SortId>('deadline');
  readonly search = signal('');
  readonly page = signal(0);
  readonly wizardOpen = signal(false);
  readonly refreshing = signal(false);

  constructor() {
    // Opened from Home's "New case" (/cases?create=1).
    if (inject(ActivatedRoute).snapshot.queryParamMap.get('create')) this.wizardOpen.set(true);
  }

  readonly cases = computed(() => this.#rt.cases());
  readonly counts = computed(() => countByFilter(this.cases()));
  readonly result = computed(() =>
    queryCases(this.cases(), { search: this.search(), filter: this.filterId(), sort: this.sort(), page: this.page(), pageSize: TABLE_PAGE }));
  readonly rangeFrom = computed(() => (this.result().matched === 0 ? 0 : this.result().page * TABLE_PAGE + 1));
  readonly rangeTo = computed(() => Math.min((this.result().page + 1) * TABLE_PAGE, this.result().matched));

  setFilter(f: FilterId): void { this.filterId.set(f); this.page.set(0); }
  setSort(s: SortId): void { this.sort.set(s); this.page.set(0); }
  onSearch(ev: Event): void { this.search.set((ev.target as HTMLInputElement).value); this.page.set(0); }
  prevPage(): void { this.page.update((p) => Math.max(0, p - 1)); }
  nextPage(): void { this.page.update((p) => Math.min(this.result().pageCount - 1, p + 1)); }
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
    this.#router.navigate(['/cases', caseRef]);
  }

  exportCsv(): void {
    const pii = this.#rt.piiAuthorized();
    const matched = queryCases(this.cases(), { search: this.search(), filter: this.filterId(), sort: this.sort(), page: 0, pageSize: Number.MAX_SAFE_INTEGER }).rows;
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
