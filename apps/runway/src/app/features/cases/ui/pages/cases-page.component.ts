import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { GovernanceService } from '../../../../core/governance/governance.service';
import { StateChipComponent, stateTone } from '../../../../shared/state-chip.component';
import { IconComponent } from '../../../../shared/icon.component';
import { CasesViewModel } from '../../state/cases.view-model';
import { FILTERS, SORTS, type CaseFilterId, type CaseSortId } from '../../application/queries/case-query';
import type { CreateCaseInput } from '../../application/ports/case.repository';
import type { Case } from '../../domain/case.entity';
import { IntakeWizardComponent } from '../components/intake-wizard.component';

function csvCell(v: unknown): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Cases — the readiness registry: a command bar and an elevated, paginated
 * table. Smart page: provides and binds the CasesViewModel. PII masking goes
 * through the GovernanceService.
 */
@Component({
  selector: 'rw-cases',
  imports: [IntakeWizardComponent, StateChipComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CasesViewModel],
  template: `
    <div class="surface">
      <div class="cbar">
        <button type="button" class="cmd" (click)="refresh()"><rw-icon name="refresh" [size]="17" [class.spin]="refreshing()" />Refresh</button>
        <button type="button" class="cmd" (click)="exportCsv()"><rw-icon name="download" [size]="17" />Export</button>
        <label class="qsearch">
          <rw-icon name="search" [size]="15" />
          <input type="text" [value]="vm.search()" (input)="onSearch($event)" placeholder="Filter this list" aria-label="Filter cases" />
        </label>
        <span class="grow"></span>
        <label class="picker">
          <rw-icon name="sort" [size]="16" />
          <select [value]="vm.sort()" (change)="setSort($any($event.target).value)" aria-label="Sort cases">
            @for (s of sorts; track s.id) { <option [value]="s.id">{{ s.label }}</option> }
          </select>
        </label>
        <label class="picker">
          <rw-icon name="filter" [size]="16" />
          <select [value]="vm.filterId()" (change)="setFilter($any($event.target).value)" aria-label="Filter cases">
            @for (f of filters; track f.id) { <option [value]="f.id">{{ f.label }} ({{ vm.counts()[f.id] }})</option> }
          </select>
        </label>
        <button type="button" class="btn primary" (click)="wizardOpen.set(true)"><rw-icon name="add" [size]="16" />New case</button>
      </div>

      <div class="tablecard">
        <div class="tscroll">
          <table>
            <thead>
              <tr>
                <th class="sortable" (click)="setSort('name')">Joiner @if (vm.sort() === 'name') { <rw-icon name="chevron-down" [size]="13" /> }</th>
                <th>Case</th>
                <th>Role</th>
                <th>Pathway</th>
                <th>State</th>
                <th class="sortable" (click)="setSort('readiness')">Readiness @if (vm.sort() === 'readiness') { <rw-icon name="chevron-down" [size]="13" /> }</th>
                <th class="sortable" (click)="setSort('deadline')">Ready by @if (vm.sort() === 'deadline') { <rw-icon name="chevron-down" [size]="13" /> }</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              @for (c of vm.result().rows; track c.caseRef) {
                <tr (click)="open(c.caseRef)">
                  <td class="name">{{ name(c) }}</td>
                  <td class="mono">{{ c.caseRef }}</td>
                  <td>{{ c.role }}</td>
                  <td>{{ c.pathway === 'project-level' ? 'Project' : 'Centre' }}</td>
                  <td><rw-chip [label]="c.stateLabel" [tone]="tone(c)" /></td>
                  <td><span class="rcell"><span class="mini"><span class="mini-fill" [style.width.%]="c.confidencePct"></span></span>{{ c.confidencePct }}%</span></td>
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
          <span class="range">{{ vm.rangeFrom() }}–{{ vm.rangeTo() }} of {{ vm.result().matched }}</span>
          <span class="grow"></span>
          <button type="button" class="pbtn" [disabled]="vm.result().page === 0" (click)="vm.prevPage()"><rw-icon name="chevron-right" [size]="16" class="flip" /></button>
          <span class="pnum">{{ vm.result().page + 1 }} / {{ vm.result().pageCount }}</span>
          <button type="button" class="pbtn" [disabled]="vm.result().page >= vm.result().pageCount - 1" (click)="vm.nextPage()"><rw-icon name="chevron-right" [size]="16" /></button>
        </div>
      </div>
    </div>

    @if (wizardOpen()) {
      <rw-intake-wizard (close)="wizardOpen.set(false)" (submit)="onSubmit($event)" />
    }
  `,
  styles: `
    :host { display: block; height: 100%; min-height: 0; }
    .surface { display: flex; flex-direction: column; height: 100%; min-height: 0; background: var(--bg); }

    .cbar {
      flex: none;
      display: flex;
      align-items: center;
      gap: var(--s-12);
      padding: var(--s-10) var(--s-16);
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      font-size: var(--fs-300);
    }
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
    .tablecard {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      background: var(--surface);
      box-shadow: var(--shadow-4);
      overflow: hidden;
    }
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
export class CasesPageComponent {
  readonly vm = inject(CasesViewModel);
  readonly #gov = inject(GovernanceService);
  readonly #router = inject(Router);
  readonly filters = FILTERS;
  readonly sorts = SORTS;

  readonly wizardOpen = signal(false);
  readonly refreshing = signal(false);

  constructor() {
    // Opened from Home's "New case" (/cases?create=1).
    if (inject(ActivatedRoute).snapshot.queryParamMap.get('create')) this.wizardOpen.set(true);
  }

  setFilter(f: CaseFilterId): void { this.vm.setFilter(f); }
  setSort(s: CaseSortId): void { this.vm.setSort(s); }
  onSearch(ev: Event): void { this.vm.setSearch((ev.target as HTMLInputElement).value); }
  open(ref: string): void { this.#router.navigate(['/cases', ref]); }

  name(c: Case): string { return this.#gov.mask(c.joinerName); }
  tone(c: Case) { return stateTone(c.state); }

  refresh(): void {
    void this.vm.refresh();
    this.refreshing.set(true);
    setTimeout(() => this.refreshing.set(false), 600);
  }

  async onSubmit(input: CreateCaseInput): Promise<void> {
    const created = await this.vm.create(input);
    if (created) {
      this.wizardOpen.set(false);
      this.#router.navigate(['/cases', created.caseRef]);
    }
  }

  exportCsv(): void {
    const header = ['Case', 'Joiner', 'Role', 'Location', 'Pathway', 'State', 'Readiness %', 'Day 1', 'Ready by'];
    const lines = [header.join(',')];
    for (const c of this.vm.allMatched()) {
      lines.push([
        c.caseRef, this.#gov.mask(c.joinerName), c.role, c.location, c.pathway,
        c.stateLabel, c.confidencePct, c.startDate, c.readinessDeadline,
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
