import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { RuntimeService } from '../runtime/runtime.service';
import { ShellService } from '../shell/shell.service';
import { CaseDetailComponent } from './case-detail.component';
import { IntakeWizardComponent } from '../shell/intake-wizard.component';
import { StateChipComponent, stateTone } from '../shared/state-chip.component';
import { IconComponent } from '../shared/icon.component';
import { maskPersonal } from '../domain/data-dictionary';
import { READINESS_STATE_LABEL, type ReadinessRecord, type ReadinessState } from '../domain/model';

type FilterId = 'all' | 'at-risk' | 'blocked' | 'ready' | 'completed';
type SortId = 'deadline' | 'readiness' | 'created' | 'name';

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All cases' },
  { id: 'at-risk', label: 'At risk' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'ready', label: 'Ready' },
  { id: 'completed', label: 'Completed' },
];
const SORTS: { id: SortId; label: string }[] = [
  { id: 'deadline', label: 'Ready by' },
  { id: 'readiness', label: 'Readiness' },
  { id: 'created', label: 'Newest' },
  { id: 'name', label: 'Name' },
];
const TODAY = new Date().toISOString().slice(0, 10);
const AT_RISK_STATES: ReadinessState[] = ['blocked', 'exception', 'waiting-for-info'];

function csvCell(v: unknown): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Cases surface: a compact command bar over a flush master-detail. */
@Component({
  selector: 'rw-cases',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CaseDetailComponent, IntakeWizardComponent, StateChipComponent, IconComponent],
  template: `
    <div class="surface">
      <div class="cmdbar">
        <button type="button" class="btn primary" (click)="wizardOpen.set(true)"><rw-icon name="add" [size]="16" />New case</button>
        <span class="divider"></span>
        <button type="button" class="cmd" (click)="refresh()"><rw-icon name="refresh" [size]="17" [class.spin]="refreshing()" />Refresh</button>
        <button type="button" class="cmd" (click)="exportCsv()"><rw-icon name="download" [size]="17" />Export</button>

        <span class="grow"></span>

        <label class="picker">
          <rw-icon name="sort" [size]="16" />
          <select [value]="sort()" (change)="sort.set($any($event.target).value)" aria-label="Sort cases">
            @for (s of sorts; track s.id) { <option [value]="s.id">{{ s.label }}</option> }
          </select>
        </label>
        <label class="picker">
          <rw-icon name="filter" [size]="16" />
          <select [value]="filter()" (change)="filter.set($any($event.target).value)" aria-label="Filter cases">
            @for (f of filters; track f.id) { <option [value]="f.id">{{ f.label }} ({{ countFor(f.id) }})</option> }
          </select>
        </label>
      </div>

      <div class="content">
        <aside class="list">
          @for (c of filtered(); track c.caseRef) {
            <button type="button" class="row" [class.sel]="c.caseRef === selectedRef()" (click)="select(c.caseRef)">
              <span class="pw" [attr.data-pw]="c.pathway"><rw-icon [name]="c.pathway === 'project-level' ? 'branch' : 'cases'" [size]="16" /></span>
              <span class="rbody">
                <span class="r1">
                  <span class="joiner">{{ name(c) }}</span>
                  <rw-chip [label]="label(c)" [tone]="tone(c)" />
                </span>
                <span class="r2">
                  <span class="ref">{{ c.caseRef }}</span>
                  <span class="dot">·</span>
                  <span class="pathway">{{ c.pathway === 'project-level' ? 'Project' : 'Centre' }}</span>
                  <span class="grow"></span>
                  <span class="mini"><span class="mini-fill" [style.width.%]="pct(c)"></span></span>
                  <span class="pct">{{ pct(c) }}%</span>
                </span>
              </span>
            </button>
          } @empty {
            <div class="list-empty"><rw-icon name="check-circle" [size]="26" /><p>No cases in this view.</p></div>
          }
        </aside>

        <div class="detail">
          @if (selected(); as s) {
            <rw-case-detail [rec]="s" />
          } @else {
            <div class="detail-empty">
              <rw-icon name="cases" [size]="30" />
              <p>Select a case, or create one.</p>
              <button type="button" class="btn primary" (click)="wizardOpen.set(true)"><rw-icon name="add" [size]="16" />New case</button>
            </div>
          }
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

    .cmdbar { flex: none; display: flex; align-items: center; gap: var(--s-4); height: 48px; padding: 0 var(--s-16); border-bottom: 1px solid var(--border); }
    .divider { width: 1px; height: 20px; background: var(--border); margin: 0 var(--s-8); }
    .grow { flex: 1; }

    /* Uniform 32px controls so the bar reads as one row (Fluent). */
    .btn { display: inline-flex; align-items: center; gap: var(--s-6); height: 32px; padding: 0 var(--s-12); border: 1px solid transparent; border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-300); font-weight: var(--fw-semibold); cursor: pointer; box-shadow: none; }
    .btn.primary { background: var(--brand); color: #fff; }
    .btn.primary:hover { background: var(--brand-hover); }
    .btn.primary:active { background: var(--brand-pressed); }
    .cmd { display: inline-flex; align-items: center; gap: var(--s-6); height: 32px; padding: 0 var(--s-10); border: none; background: transparent; color: var(--muted); border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-200); font-weight: var(--fw-semibold); cursor: pointer; }
    .cmd:hover { background: var(--surface-3); color: var(--text); }
    .cmd rw-icon { color: var(--faint); }
    .cmd:hover rw-icon { color: var(--accent); }
    .spin { animation: rw-spin 0.6s ease; }

    .picker { display: inline-flex; align-items: center; gap: var(--s-4); height: 32px; padding: 0 var(--s-6); border-radius: var(--radius-sm); color: var(--faint); }
    .picker:hover { background: var(--surface-3); }
    .picker rw-icon { color: var(--faint); }
    .picker select { border: none; background: transparent; font: inherit; font-size: var(--fs-200); font-weight: var(--fw-semibold); color: var(--muted); cursor: pointer; padding: var(--s-2); }
    .picker select:focus { outline: none; }

    .content { flex: 1; min-height: 0; display: grid; grid-template-columns: 340px 1fr; }

    .list { border-right: 1px solid var(--border); background: var(--surface); overflow-y: auto; padding: var(--s-8); min-height: 0; }
    .row { position: relative; display: flex; align-items: flex-start; gap: var(--s-10); width: 100%; text-align: left; background: transparent; border: 1px solid transparent; border-radius: var(--radius); padding: var(--s-10); cursor: pointer; margin-bottom: 2px; font: inherit; transition: background 0.1s ease; }
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
    .mini { width: 46px; height: 4px; border-radius: var(--radius-pill); background: var(--idle-weak); overflow: hidden; }
    .mini-fill { display: block; height: 100%; background: var(--ok); border-radius: var(--radius-pill); }
    .r2 .pct { color: var(--faint); font-variant-numeric: tabular-nums; min-width: 30px; text-align: right; }
    .list-empty { text-align: center; color: var(--faint); padding: 48px 16px; }
    .list-empty rw-icon { color: var(--idle); }
    .list-empty p { margin: var(--s-8) 0 0; font-size: var(--fs-200); }

    .detail { min-width: 0; overflow: hidden; display: flex; flex-direction: column; background: var(--bg); }
    rw-case-detail { flex: 1; min-height: 0; }
    .detail-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--s-12); color: var(--muted); }
    .detail-empty rw-icon { color: var(--idle); }
    .detail-empty p { margin: 0; }

    @keyframes rw-spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
  `,
})
export class CasesComponent {
  readonly #rt = inject(RuntimeService);
  readonly #shell = inject(ShellService);
  readonly filters = FILTERS;
  readonly sorts = SORTS;

  readonly filter = signal<FilterId>('all');
  readonly sort = signal<SortId>('deadline');
  readonly wizardOpen = signal(false);
  readonly refreshing = signal(false);

  readonly cases = computed(() => this.#rt.cases());

  readonly filtered = computed(() => {
    const list = this.cases().filter((c) => this.#matches(c, this.filter()));
    return [...list].sort(this.#comparator(this.sort()));
  });

  readonly selectedRef = computed(() => {
    const sel = this.#shell.selectedCaseRef();
    const list = this.filtered();
    if (sel && list.some((c) => c.caseRef === sel)) return sel;
    return list[0]?.caseRef ?? this.cases()[0]?.caseRef ?? '';
  });
  readonly selected = computed(() => this.#rt.caseByRef(this.selectedRef()));

  countFor(id: FilterId): number {
    return this.cases().filter((c) => this.#matches(c, id)).length;
  }

  select(ref: string): void { this.#shell.selectedCaseRef.set(ref); }
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
    this.filter.set('all');
    this.#shell.selectedCaseRef.set(caseRef);
  }

  exportCsv(): void {
    const pii = this.#rt.piiAuthorized();
    const header = ['Case', 'Joiner', 'Role', 'Location', 'Pathway', 'State', 'Readiness %', 'Day 1', 'Ready by'];
    const lines = [header.join(',')];
    for (const c of this.filtered()) {
      lines.push([
        c.caseRef, maskPersonal(c.joinerName, pii), c.role, c.location, c.pathway,
        READINESS_STATE_LABEL[c.state], this.pct(c), c.startDate, c.readinessDeadline,
      ].map(csvCell).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `runway-cases-${TODAY}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  #overdue(c: ReadinessRecord): boolean {
    return c.readinessDeadline < TODAY && c.state !== 'completed' && c.state !== 'ready-for-day-1';
  }

  #matches(c: ReadinessRecord, id: FilterId): boolean {
    switch (id) {
      case 'all': return true;
      case 'at-risk': return AT_RISK_STATES.includes(c.state) || this.#overdue(c);
      case 'blocked': return c.state === 'blocked' || c.state === 'exception';
      case 'ready': return c.state === 'ready-for-day-1';
      case 'completed': return c.state === 'completed';
    }
  }

  #comparator(sort: SortId): (a: ReadinessRecord, b: ReadinessRecord) => number {
    switch (sort) {
      case 'readiness': return (a, b) => this.#rt.confidence(b) - this.#rt.confidence(a);
      case 'created': return (a, b) => b.createdAt.localeCompare(a.createdAt);
      case 'name': return (a, b) => a.joinerName.localeCompare(b.joinerName);
      case 'deadline':
      default: return (a, b) => a.readinessDeadline.localeCompare(b.readinessDeadline);
    }
  }
}
