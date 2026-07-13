import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RuntimeService } from '../runtime/runtime.service';
import { StateChipComponent, stateTone } from '../shared/state-chip.component';
import { IconComponent, type IconName } from '../shared/icon.component';
import { maskPersonal } from '../domain/data-dictionary';
import { READINESS_STATE_LABEL, confidenceOf, type ReadinessRecord } from '../domain/model';
import { matchesFilter } from '../features/cases';

type Tone = 'accent' | 'ok' | 'warn' | 'danger' | 'info';
interface Tile { label: string; value: number; icon: IconName; tone: Tone; link: string; }
const TODAY = new Date().toISOString().slice(0, 10);

/** Overview dashboard — onboarding readiness at a glance (the reporting surface). */
@Component({
  selector: 'rw-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StateChipComponent, IconComponent],
  template: `
    <div class="wrap">
      <header class="head">
        <div>
          <h1>Overview</h1>
          <p class="sub">Onboarding readiness across all active cases.</p>
        </div>
        <a class="btn primary" routerLink="/cases" [queryParams]="{ create: 1 }"><rw-icon name="add" [size]="16" />New case</a>
      </header>

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
          <span class="rc-pct">{{ avgReadiness() }}%</span>
        </div>
        <div class="rc-bar"><span [style.width.%]="avgReadiness()"></span></div>
        <div class="rc-legend">
          @for (s of distribution(); track s.label) {
            <span class="rc-seg"><i [style.background]="s.color"></i>{{ s.label }} <b>{{ s.count }}</b></span>
          }
        </div>
      </div>

      <div class="cols">
        <section class="panel">
          <div class="p-head"><rw-icon name="warning" [size]="16" /><h2>Needs attention</h2><a routerLink="/cases">All cases <rw-icon name="chevron-right" [size]="13" /></a></div>
          @for (c of atRisk(); track c.caseRef) {
            <a class="prow" [routerLink]="['/cases', c.caseRef]">
              <span class="pw" [attr.data-pw]="c.pathway"><rw-icon [name]="c.pathway === 'project-level' ? 'branch' : 'cases'" [size]="15" /></span>
              <span class="pbody">
                <span class="pname">{{ name(c) }}</span>
                <span class="pmeta">{{ c.caseRef }} · ready by {{ c.readinessDeadline }}</span>
              </span>
              <rw-chip [label]="label(c)" [tone]="tone(c)" />
            </a>
          } @empty {
            <div class="p-empty"><rw-icon name="check-circle" [size]="22" /><p>Nothing at risk right now.</p></div>
          }
        </section>

        <section class="panel">
          <div class="p-head"><rw-icon name="clock" [size]="16" /><h2>Upcoming Day 1</h2><a routerLink="/cases">All cases <rw-icon name="chevron-right" [size]="13" /></a></div>
          @for (c of upcoming(); track c.caseRef) {
            <a class="prow" [routerLink]="['/cases', c.caseRef]">
              <span class="daybox"><span class="d-day">{{ day(c.startDate) }}</span><span class="d-mon">{{ mon(c.startDate) }}</span></span>
              <span class="pbody">
                <span class="pname">{{ name(c) }}</span>
                <span class="pmeta">{{ c.role }} · {{ pct(c) }}% ready</span>
              </span>
              <rw-chip [label]="label(c)" [tone]="tone(c)" />
            </a>
          } @empty {
            <div class="p-empty"><rw-icon name="clock" [size]="22" /><p>No upcoming start dates.</p></div>
          }
        </section>
      </div>
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
export class HomeComponent {
  readonly #rt = inject(RuntimeService);

  readonly #cases = computed(() => this.#rt.cases());

  readonly tiles = computed<Tile[]>(() => {
    const cs = this.#cases();
    return [
      { label: 'Open actions', value: this.#rt.openActions().length, icon: 'alert', tone: 'accent', link: '/inbox' },
      { label: 'At risk', value: cs.filter((c) => matchesFilter(c, 'at-risk')).length, icon: 'warning', tone: 'danger', link: '/cases' },
      { label: 'In progress', value: cs.filter((c) => c.state === 'in-progress').length, icon: 'sync', tone: 'info', link: '/cases' },
      { label: 'Ready for Day 1', value: cs.filter((c) => c.state === 'ready-for-day-1').length, icon: 'flag', tone: 'ok', link: '/cases' },
    ];
  });

  readonly avgReadiness = computed(() => {
    const active = this.#cases().filter((c) => c.state !== 'completed' && c.state !== 'cancelled');
    if (!active.length) return 0;
    return Math.round((active.reduce((s, c) => s + confidenceOf(c), 0) / active.length) * 100);
  });

  readonly distribution = computed(() => {
    const cs = this.#cases();
    const n = (fn: (c: ReadinessRecord) => boolean) => cs.filter(fn).length;
    return [
      { label: 'Ready / done', color: '#107c10', count: n((c) => c.state === 'ready-for-day-1' || c.state === 'completed') },
      { label: 'In progress', color: '#7500c0', count: n((c) => c.state === 'in-progress' || c.state === 'ready-for-orchestration') },
      { label: 'Waiting', color: '#bc4b09', count: n((c) => c.state === 'waiting-for-info') },
      { label: 'Blocked', color: '#c50f1f', count: n((c) => c.state === 'blocked' || c.state === 'exception') },
    ];
  });

  readonly atRisk = computed(() =>
    this.#cases().filter((c) => matchesFilter(c, 'at-risk')).sort((a, b) => a.readinessDeadline.localeCompare(b.readinessDeadline)).slice(0, 5));

  readonly upcoming = computed(() =>
    this.#cases()
      .filter((c) => c.startDate >= TODAY && c.state !== 'completed' && c.state !== 'cancelled')
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 5));

  name(c: ReadinessRecord): string { return maskPersonal(c.joinerName, this.#rt.piiAuthorized()); }
  label(c: ReadinessRecord): string { return READINESS_STATE_LABEL[c.state]; }
  tone(c: ReadinessRecord) { return stateTone(c.state); }
  pct(c: ReadinessRecord): number { return Math.round(confidenceOf(c) * 100); }
  day(iso: string): string { return String(new Date(iso).getDate()); }
  mon(iso: string): string { return new Date(iso).toLocaleString(undefined, { month: 'short' }); }
}
