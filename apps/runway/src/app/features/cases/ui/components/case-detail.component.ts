import { Component, ChangeDetectionStrategy, computed, input, signal } from '@angular/core';
import { StateChipComponent, itemTone, stateTone, ITEM_STATE_LABEL } from '../../../../shared/state-chip.component';
import { IconComponent, type IconName } from '../../../../shared/icon.component';
import type { Fulfilment, DomainEvent, ReadinessItemState, Actor } from '../../../../domain/model';
import { ProcessMapComponent } from '../../../../operate/process-map.component';
import type { Case } from '../../domain/case.entity';

const FULFIL_LABEL: Record<Fulfilment, string> = { auto: 'Automated', 'agent-assisted': 'Agent-assisted', human: 'Human' };
const FULFIL_ICON: Record<Fulfilment, IconName> = { auto: 'flash', 'agent-assisted': 'bot', human: 'person' };
const ITEM_ICON: Record<ReadinessItemState, IconName> = {
  done: 'check-circle', blocked: 'error-circle', 'awaiting-human': 'clock',
  'in-progress': 'sync', pending: 'circle', skipped: 'minus-circle',
};
const ACTOR_ICON: Record<Actor, IconName> = { agent: 'bot', human: 'person', system: 'settings' };
const TODAY = new Date().toISOString().slice(0, 10);

/**
 * The readiness view for one case: outcome-first, with a readiness/flow toggle.
 * Dumb presentational component — it receives the `Case` entity, its activity
 * events, and the (already masked) joiner name via inputs; it holds no services.
 *
 * TODO (strangler): `rw-process-map` still lives in operate/ — it moves into a
 * processes slice when that migrates; this import is the temporary seam.
 */
@Component({
  selector: 'rw-case-detail',
  imports: [StateChipComponent, ProcessMapComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="topinfo">
      <header class="head">
        <div class="who">
          <h1>{{ joinerName() }}</h1>
          <p class="meta">
            {{ case().role }} <span class="dot">·</span> {{ case().location }}
            <span class="dot">·</span> <span class="pathway">{{ pathwayLabel() }}</span>
            <span class="dot">·</span> <span class="pv">{{ case().processVersion }}</span>
          </p>
        </div>
        <rw-chip [label]="case().stateLabel" [tone]="tone()" [icon]="stateIcon()" />
      </header>

      <div class="confidence">
        <div class="bar"><span [style.width.%]="case().confidencePct"></span></div>
        <span class="pct">{{ case().confidencePct }}% ready</span>
        <span class="grow"></span>
        <span class="deadline" [class.overdue]="overdue()">
          <rw-icon [name]="overdue() ? 'warning' : 'clock'" [size]="15" />
          Day 1 {{ case().startDate }} · ready by {{ case().readinessDeadline }}
        </span>
      </div>

      <div class="owners">
        <span><b>Owner</b> {{ case().owners.current || '—' }}</span>
        <span><b>Next</b> {{ case().owners.nextAction || '—' }}</span>
        <span><b>Escalation</b> {{ case().owners.escalation || '—' }}</span>
      </div>

      @if (case().blockers.length) {
        <div class="blockers">
          @for (b of case().blockers; track b.detail) {
            <div class="blocker">
              <rw-icon name="warning-filled" [size]="16" />
              <span><span class="bk">{{ b.kind }}</span>{{ b.detail }}</span>
            </div>
          }
        </div>
      }

      <div class="tabs">
        <button type="button" [class.active]="tab() === 'readiness'" (click)="tab.set('readiness')">Readiness</button>
        <button type="button" [class.active]="tab() === 'flow'" (click)="tab.set('flow')">Process map</button>
      </div>
    </div>

    @if (tab() === 'readiness') {
      <div class="body scroll">
        <section>
          <h2 class="section">Readiness items</h2>
          <div class="items">
            @for (it of case().items; track it.id) {
              <div class="item">
                <span class="istate" [attr.data-tone]="itemToneOf(it.state)"><rw-icon [name]="itemIcon(it.state)" [size]="18" /></span>
                <div class="ibody">
                  <div class="label">{{ it.label }}</div>
                  <div class="itmeta">
                    <span class="cat">{{ it.category }}</span>
                    <span class="fulfil" [attr.data-f]="it.fulfilment"><rw-icon [name]="fulfilIcon(it.fulfilment)" [size]="13" />{{ fulfil(it.fulfilment) }}</span>
                    @if (it.owner) { <span class="mi">{{ it.owner }}</span> }
                    @if (it.due) { <span class="mi">due {{ it.due }}</span> }
                    @if (it.taskRef) { <span class="ref">{{ it.taskRef.system }}:{{ it.taskRef.id }}</span> }
                  </div>
                  @if (it.blocker) { <div class="ib"><rw-icon name="error-circle" [size]="13" />{{ it.blocker.detail }}</div> }
                </div>
                <rw-chip [label]="itemLabel(it.state)" [tone]="itemToneOf(it.state)" />
              </div>
            }
          </div>
        </section>

        <section>
          <h2 class="section">Activity</h2>
          <ol class="timeline">
            @for (e of events(); track e.id) {
              <li>
                <span class="axis" [attr.data-actor]="e.actor"><rw-icon [name]="actorIcon(e.actor)" [size]="13" /></span>
                <div class="ev">
                  <div class="row">
                    <span class="actor" [attr.data-actor]="e.actor">{{ e.actor }}</span>
                    <span class="etype">{{ e.type }}</span>
                    <span class="grow"></span>
                    <span class="at">{{ when(e.at) }}</span>
                  </div>
                  <div class="summary">{{ e.summary }}</div>
                </div>
              </li>
            }
          </ol>
        </section>
      </div>
    } @else {
      <div class="body map">
        <rw-process-map [rec]="case().record" />
      </div>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; height: 100%; min-height: 0; background: var(--surface); }
    .topinfo { flex: none; padding: var(--s-24) var(--s-32) 0; background: var(--surface); border-bottom: 1px solid var(--border); }
    .head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--s-12); }
    h1 { margin: 0; font-family: var(--font-display); font-size: var(--fs-500); font-weight: var(--fw-bold); letter-spacing: -0.02em; }
    .meta { margin: var(--s-4) 0 0; color: var(--muted); font-size: var(--fs-300); }
    .meta .dot { color: var(--faint); margin: 0 var(--s-4); }
    .meta .pathway { text-transform: capitalize; }
    .meta .pv { font-family: var(--font-mono); font-size: var(--fs-200); color: var(--faint); }

    .confidence { display: flex; align-items: center; gap: var(--s-10); margin: var(--s-16) 0 var(--s-12); font-size: var(--fs-200); color: var(--muted); }
    .bar { flex: 0 0 200px; height: 8px; background: var(--idle-weak); border-radius: var(--radius-pill); overflow: hidden; }
    .bar > span { display: block; height: 100%; background: var(--ok); border-radius: var(--radius-pill); transition: width 0.3s ease; }
    .pct { font-weight: var(--fw-semibold); color: var(--text); }
    .grow { flex: 1; }
    .deadline { display: inline-flex; align-items: center; gap: var(--s-6); color: var(--muted); }
    .deadline.overdue { color: var(--danger); font-weight: var(--fw-semibold); }

    .owners { display: flex; gap: var(--s-24); flex-wrap: wrap; padding: var(--s-12) 0; font-size: var(--fs-300); color: var(--text); border-top: 1px solid var(--border); }
    .owners b { color: var(--faint); font-weight: var(--fw-bold); margin-right: var(--s-6); font-size: var(--fs-100); text-transform: uppercase; letter-spacing: 0.05em; }

    .blockers { margin: 0 0 var(--s-12); display: flex; flex-direction: column; gap: var(--s-8); }
    .blocker { display: flex; align-items: flex-start; gap: var(--s-8); background: var(--danger-weak); color: var(--danger); border-radius: var(--radius); padding: var(--s-10) var(--s-12); font-size: var(--fs-300); }
    .blocker rw-icon { flex: none; margin-top: 1px; }
    .blocker .bk { font-size: var(--fs-100); text-transform: uppercase; letter-spacing: 0.05em; font-weight: var(--fw-bold); margin-right: var(--s-8); opacity: 0.85; }

    .tabs { display: flex; gap: var(--s-4); margin-top: var(--s-4); }
    .tabs button { position: relative; border: none; background: transparent; font: inherit; font-size: var(--fs-300); font-weight: var(--fw-semibold); color: var(--muted); padding: var(--s-10) var(--s-12); cursor: pointer; }
    .tabs button:hover { color: var(--text); }
    .tabs button.active { color: var(--accent); }
    .tabs button.active::after { content: ''; position: absolute; left: var(--s-12); right: var(--s-12); bottom: 0; height: 2.5px; background: var(--brand); border-radius: var(--radius-pill); }

    .body { flex: 1; min-height: 0; }
    .body.scroll { overflow-y: auto; padding: 0 var(--s-32) var(--s-40); }
    .body.map { padding: 0; }

    .section { font-size: var(--fs-200); text-transform: uppercase; letter-spacing: 0.06em; color: var(--faint); font-weight: var(--fw-bold); margin: var(--s-24) 0 var(--s-10); }
    .items { display: flex; flex-direction: column; gap: var(--s-8); }
    .item { display: flex; align-items: center; gap: var(--s-12); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: var(--s-12) var(--s-16); transition: border-color 0.1s ease; }
    .item:hover { border-color: var(--border-strong); }
    .istate { display: inline-grid; place-items: center; flex: none; width: 28px; height: 28px; border-radius: 50%; background: var(--tone-weak, var(--idle-weak)); color: var(--tone-strong, var(--muted)); }
    .istate[data-tone="ok"]     { --tone-weak: var(--ok-weak);     --tone-strong: var(--ok); }
    .istate[data-tone="warn"]   { --tone-weak: var(--warn-weak);   --tone-strong: var(--warn); }
    .istate[data-tone="danger"] { --tone-weak: var(--danger-weak); --tone-strong: var(--danger); }
    .istate[data-tone="info"]   { --tone-weak: var(--info-weak);   --tone-strong: var(--info); }
    .istate[data-tone="idle"]   { --tone-weak: var(--idle-weak);   --tone-strong: var(--muted); }
    .ibody { flex: 1; min-width: 0; }
    .item .label { font-size: var(--fs-300); font-weight: var(--fw-semibold); }
    .itmeta { font-size: var(--fs-200); color: var(--muted); display: flex; gap: var(--s-8); flex-wrap: wrap; align-items: center; margin-top: 3px; }
    .itmeta .cat { text-transform: uppercase; letter-spacing: 0.05em; font-size: var(--fs-100); font-weight: var(--fw-bold); color: var(--faint); }
    .itmeta .mi { color: var(--muted); }
    .itmeta .ref { font-family: var(--font-mono); color: var(--faint); }
    .fulfil { display: inline-flex; align-items: center; gap: 4px; font-weight: var(--fw-semibold); }
    .fulfil[data-f="auto"] { color: var(--accent); }
    .fulfil[data-f="agent-assisted"] { color: var(--info); }
    .fulfil[data-f="human"] { color: var(--warn); }
    .ib { display: inline-flex; align-items: center; gap: 5px; font-size: var(--fs-200); color: var(--danger); margin-top: var(--s-4); }

    .timeline { list-style: none; margin: 0; padding: 0; }
    .timeline li { display: flex; gap: var(--s-12); }
    .axis { flex: 0 0 24px; height: 24px; display: inline-grid; place-items: center; position: relative; border-radius: 50%; background: var(--idle-weak); color: var(--muted); z-index: 1; }
    .axis::after { content: ''; position: absolute; left: 50%; top: 24px; bottom: -6px; width: 2px; transform: translateX(-50%); background: var(--border); z-index: 0; }
    .timeline li:last-child .axis::after { display: none; }
    .axis[data-actor="agent"] { background: var(--accent-weak); color: var(--accent); }
    .axis[data-actor="human"] { background: var(--info-weak); color: var(--info); }
    .ev { flex: 1; padding-bottom: var(--s-16); }
    .ev .row { display: flex; align-items: center; gap: var(--s-8); font-size: var(--fs-100); color: var(--muted); }
    .actor { text-transform: uppercase; letter-spacing: 0.05em; font-weight: var(--fw-bold); }
    .actor[data-actor="agent"] { color: var(--accent); }
    .actor[data-actor="human"] { color: var(--info); }
    .actor[data-actor="system"] { color: var(--faint); }
    .etype { font-family: var(--font-mono); color: var(--faint); }
    .at { color: var(--faint); }
    .summary { font-size: var(--fs-300); margin-top: 2px; }
  `,
})
export class CaseDetailComponent {
  readonly case = input.required<Case>();
  readonly events = input.required<DomainEvent[]>();
  readonly joinerName = input.required<string>();

  readonly tab = signal<'readiness' | 'flow'>('readiness');

  readonly tone = computed(() => stateTone(this.case().state));
  readonly stateIcon = computed<IconName>(() => {
    const t = this.tone();
    return t === 'ok' ? 'check-circle' : t === 'danger' ? 'error-circle' : t === 'warn' ? 'warning' : t === 'info' ? 'sync' : 'circle';
  });
  readonly pathwayLabel = computed(() => (this.case().pathway === 'project-level' ? 'Project-level' : 'Centre-level'));
  readonly overdue = computed(() => this.case().isOverdue(TODAY));

  fulfil(f: Fulfilment): string { return FULFIL_LABEL[f]; }
  fulfilIcon(f: Fulfilment): IconName { return FULFIL_ICON[f]; }
  itemIcon(s: ReadinessItemState): IconName { return ITEM_ICON[s]; }
  actorIcon(a: Actor): IconName { return ACTOR_ICON[a]; }
  itemLabel = (s: Parameters<typeof itemTone>[0]) => ITEM_STATE_LABEL[s];
  itemToneOf = (s: Parameters<typeof itemTone>[0]) => itemTone(s);

  when(iso: string): string {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
