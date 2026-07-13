import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GovernanceService } from '../../../../core/governance/governance.service';
import { StateChipComponent, stateTone, type Tone } from '../../../../shared/state-chip.component';
import { IconComponent, type IconName } from '../../../../shared/icon.component';
import { OverviewViewModel } from '../../state/overview.view-model';
import type { Case } from '../../../cases';

interface Tile { label: string; value: number; icon: IconName; tone: Tone; link: string; }

/**
 * Overview dashboard — onboarding readiness at a glance (the reporting surface).
 * Smart page: provides and binds the OverviewViewModel; the tiles and
 * distribution legend are presentation projections of the summary read model.
 * PII masking goes through the GovernanceService.
 */
@Component({
  selector: 'rw-home',
  imports: [RouterLink, StateChipComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [OverviewViewModel],
  template: `
    <div class="wrap">
      <header class="head">
        <div>
          <h1>Overview</h1>
          <p class="sub">Onboarding readiness across all active cases.</p>
        </div>
        <a class="btn primary" routerLink="/cases" [queryParams]="{ create: 1 }"><rw-icon name="add" [size]="16" />New case</a>
      </header>

      @if (vm.summary(); as s) {
        <div class="tiles">
          @for (t of tiles(); track t.label) {
            <a class="tile" [attr.data-tone]="t.tone" [routerLink]="t.link">
              <span class="tico"><rw-icon [name]="t.icon" [size]="20" /></span>
              <span class="tval">{{ t.value }}</span>
              <span class="tlabel">{{ t.label }}</span>
            </a>
          }
        </div>

        <div class="readiness-card">
          <div class="rc-head">
            <span class="rc-title">Overall readiness</span>
            <span class="rc-pct">{{ s.averageReadiness }}%</span>
          </div>
          <div class="rc-bar"><span [style.width.%]="s.averageReadiness"></span></div>
          <div class="rc-legend">
            @for (seg of distribution(); track seg.label) {
              <span class="rc-seg"><i [style.background]="seg.color"></i>{{ seg.label }} <b>{{ seg.count }}</b></span>
            }
          </div>
        </div>

        <div class="cols">
          <section class="panel">
            <div class="p-head"><rw-icon name="warning" [size]="16" /><h2>Needs attention</h2><a routerLink="/cases">All cases <rw-icon name="chevron-right" [size]="13" /></a></div>
            @for (c of s.atRisk; track c.caseRef) {
              <a class="prow" [routerLink]="['/cases', c.caseRef]">
                <span class="pw" [attr.data-pw]="c.pathway"><rw-icon [name]="c.pathway === 'project-level' ? 'branch' : 'cases'" [size]="15" /></span>
                <span class="pbody">
                  <span class="pname">{{ name(c) }}</span>
                  <span class="pmeta">{{ c.caseRef }} · ready by {{ c.readinessDeadline }}</span>
                </span>
                <rw-chip [label]="c.stateLabel" [tone]="tone(c)" />
              </a>
            } @empty {
              <div class="p-empty"><rw-icon name="check-circle" [size]="22" /><p>Nothing at risk right now.</p></div>
            }
          </section>

          <section class="panel">
            <div class="p-head"><rw-icon name="clock" [size]="16" /><h2>Upcoming Day 1</h2><a routerLink="/cases">All cases <rw-icon name="chevron-right" [size]="13" /></a></div>
            @for (c of s.upcoming; track c.caseRef) {
              <a class="prow" [routerLink]="['/cases', c.caseRef]">
                <span class="daybox"><span class="d-day">{{ day(c.startDate) }}</span><span class="d-mon">{{ mon(c.startDate) }}</span></span>
                <span class="pbody">
                  <span class="pname">{{ name(c) }}</span>
                  <span class="pmeta">{{ c.role }} · {{ c.confidencePct }}% ready</span>
                </span>
                <rw-chip [label]="c.stateLabel" [tone]="tone(c)" />
              </a>
            } @empty {
              <div class="p-empty"><rw-icon name="clock" [size]="22" /><p>No upcoming start dates.</p></div>
            }
          </section>
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; overflow-y: auto; }
    .wrap { max-width: 1080px; margin: 0 auto; padding: var(--s-32) var(--s-24) 64px; }
    .head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--s-16); margin-bottom: var(--s-24); }
    h1 { margin: 0; font-family: var(--font-display); font-size: var(--fs-600); font-weight: var(--fw-bold); letter-spacing: -0.02em; }
    .sub { margin: var(--s-4) 0 0; color: var(--muted); font-size: var(--fs-300); }
    .btn { display: inline-flex; align-items: center; gap: var(--s-6); height: 34px; padding: 0 var(--s-12); border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-300); font-weight: var(--fw-semibold); text-decoration: none; cursor: pointer; }
    .btn.primary { background: var(--brand); color: #fff; }
    .btn.primary:hover { background: var(--brand-hover); }

    .tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--s-12); }
    .tile { display: flex; flex-direction: column; gap: var(--s-4); padding: var(--s-16); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-2); text-decoration: none; transition: box-shadow 0.12s ease, border-color 0.12s ease; }
    .tile:hover { box-shadow: var(--shadow-8); border-color: var(--border-strong); }
    .tico { display: inline-grid; place-items: center; width: 36px; height: 36px; border-radius: var(--radius); background: var(--tone-weak); color: var(--tone-strong); margin-bottom: var(--s-4); }
    .tval { font-family: var(--font-display); font-size: var(--fs-700); font-weight: var(--fw-bold); line-height: 1; color: var(--text); }
    .tlabel { font-size: var(--fs-200); color: var(--muted); }
    .tile[data-tone="accent"] { --tone-weak: var(--accent-weak); --tone-strong: var(--accent); }
    .tile[data-tone="danger"] { --tone-weak: var(--danger-weak); --tone-strong: var(--danger); }
    .tile[data-tone="info"]   { --tone-weak: var(--info-weak);   --tone-strong: var(--info); }
    .tile[data-tone="ok"]     { --tone-weak: var(--ok-weak);     --tone-strong: var(--ok); }
    .tile[data-tone="warn"]   { --tone-weak: var(--warn-weak);   --tone-strong: var(--warn); }

    .readiness-card { margin-top: var(--s-16); padding: var(--s-16) var(--s-20); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-2); }
    .rc-head { display: flex; align-items: baseline; justify-content: space-between; }
    .rc-title { font-size: var(--fs-300); font-weight: var(--fw-semibold); }
    .rc-pct { font-family: var(--font-display); font-size: var(--fs-500); font-weight: var(--fw-bold); color: var(--ok); }
    .rc-bar { height: 10px; border-radius: var(--radius-pill); background: var(--idle-weak); overflow: hidden; margin: var(--s-10) 0 var(--s-12); }
    .rc-bar > span { display: block; height: 100%; background: var(--ok); border-radius: var(--radius-pill); transition: width 0.3s ease; }
    .rc-legend { display: flex; flex-wrap: wrap; gap: var(--s-16); font-size: var(--fs-200); color: var(--muted); }
    .rc-seg { display: inline-flex; align-items: center; gap: var(--s-6); }
    .rc-seg i { width: 9px; height: 9px; border-radius: 2px; }
    .rc-seg b { color: var(--text); font-variant-numeric: tabular-nums; }

    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-16); margin-top: var(--s-16); }
    .panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-2); padding: var(--s-8) var(--s-12) var(--s-12); }
    .p-head { display: flex; align-items: center; gap: var(--s-8); padding: var(--s-8) var(--s-8) var(--s-10); }
    .p-head rw-icon { color: var(--muted); }
    .p-head h2 { margin: 0; font-size: var(--fs-300); font-weight: var(--fw-bold); flex: 1; }
    .p-head a { display: inline-flex; align-items: center; gap: 2px; font-size: var(--fs-200); font-weight: var(--fw-semibold); color: var(--accent); text-decoration: none; }
    .prow { display: flex; align-items: center; gap: var(--s-10); padding: var(--s-8); border-radius: var(--radius); text-decoration: none; transition: background 0.1s ease; }
    .prow:hover { background: var(--surface-3); }
    .pw { display: inline-grid; place-items: center; width: 28px; height: 28px; flex: none; border-radius: var(--radius); background: var(--surface-3); color: var(--muted); }
    .pw[data-pw="project-level"] { color: var(--info); }
    .daybox { display: inline-grid; place-items: center; width: 34px; height: 34px; flex: none; border-radius: var(--radius); background: var(--accent-weak); color: var(--accent); line-height: 1; }
    .d-day { font-size: var(--fs-300); font-weight: var(--fw-bold); }
    .d-mon { font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; }
    .pbody { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .pname { font-size: var(--fs-300); font-weight: var(--fw-semibold); color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pmeta { font-size: var(--fs-200); color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .p-empty { display: flex; flex-direction: column; align-items: center; gap: var(--s-6); padding: 28px 0; color: var(--faint); }
    .p-empty rw-icon { color: var(--ok); }
    .p-empty p { margin: 0; font-size: var(--fs-200); }

    @media (max-width: 900px) { .tiles { grid-template-columns: repeat(2, 1fr); } .cols { grid-template-columns: 1fr; } }
  `,
})
export class OverviewPageComponent {
  readonly vm = inject(OverviewViewModel);
  readonly #gov = inject(GovernanceService);

  readonly tiles = computed<Tile[]>(() => {
    const s = this.vm.summary();
    if (!s) return [];
    return [
      { label: 'Open actions', value: s.openActions, icon: 'alert', tone: 'accent', link: '/inbox' },
      { label: 'At risk', value: s.atRiskCount, icon: 'warning', tone: 'danger', link: '/cases' },
      { label: 'In progress', value: s.inProgressCount, icon: 'sync', tone: 'info', link: '/cases' },
      { label: 'Ready for Day 1', value: s.readyCount, icon: 'flag', tone: 'ok', link: '/cases' },
    ];
  });

  readonly distribution = computed(() => {
    const s = this.vm.summary();
    if (!s) return [];
    const d = s.distribution;
    return [
      { label: 'Ready / done', color: '#107c10', count: d.readyOrDone },
      { label: 'In progress', color: '#7500c0', count: d.inProgress },
      { label: 'Waiting', color: '#bc4b09', count: d.waiting },
      { label: 'Blocked', color: '#c50f1f', count: d.blocked },
    ];
  });

  name(c: Case): string { return this.#gov.mask(c.joinerName); }
  tone(c: Case): Tone { return stateTone(c.state); }
  day(iso: string): string { return String(new Date(iso).getDate()); }
  mon(iso: string): string { return new Date(iso).toLocaleString(undefined, { month: 'short' }); }
}
