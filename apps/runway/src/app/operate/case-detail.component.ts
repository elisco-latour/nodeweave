import { Component, ChangeDetectionStrategy, computed, inject, input, signal } from '@angular/core';
import { RuntimeService } from '../runtime/runtime.service';
import { StateChipComponent, itemTone, stateTone, ITEM_STATE_LABEL } from '../shared/state-chip.component';
import { maskPersonal } from '../domain/data-dictionary';
import { READINESS_STATE_LABEL, type ReadinessRecord, type Fulfilment, type DomainEvent } from '../domain/model';
import { ProcessMapComponent } from './process-map.component';

const FULFIL_LABEL: Record<Fulfilment, string> = { auto: 'Automated', 'agent-assisted': 'Agent-assisted', human: 'Human' };

/** The readiness view for one case: outcome-first, with a readiness/flow toggle. */
@Component({
  selector: 'rw-case-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StateChipComponent, ProcessMapComponent],
  template: `
    <div class="topinfo">
      <header class="head">
        <div class="who">
          <h1>{{ joinerName() }}</h1>
          <p class="meta">{{ rec().role }} · {{ rec().location }} · <span class="pathway">{{ rec().pathway }}</span> · {{ rec().processVersion }}</p>
        </div>
        <rw-chip [label]="stateLabel()" [tone]="tone()"></rw-chip>
      </header>

      <div class="confidence">
        <div class="bar"><span [style.width.%]="confidencePct()"></span></div>
        <span class="pct">{{ confidencePct() }}% ready</span>
        <span class="grow"></span>
        <span class="deadline" [class.overdue]="overdue()">Day 1 {{ rec().startDate }} · ready by {{ rec().readinessDeadline }}</span>
      </div>

      <div class="owners">
        <span><b>Owner</b> {{ rec().owners.current || '—' }}</span>
        <span><b>Next</b> {{ rec().owners.nextAction || '—' }}</span>
        <span><b>Escalation</b> {{ rec().owners.escalation || '—' }}</span>
      </div>

      @if (rec().blockers.length) {
        <div class="blockers">
          @for (b of rec().blockers; track b.detail) {
            <div class="blocker"><span class="bk">{{ b.kind }}</span>{{ b.detail }}</div>
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
            @for (it of rec().items; track it.id) {
              <div class="item">
                <span class="cat">{{ it.category }}</span>
                <div class="ibody">
                  <div class="label">{{ it.label }}</div>
                  <div class="itmeta">
                    <span class="fulfil" [attr.data-f]="it.fulfilment">{{ fulfil(it.fulfilment) }}</span>
                    @if (it.owner) { <span>· {{ it.owner }}</span> }
                    @if (it.due) { <span>· due {{ it.due }}</span> }
                    @if (it.taskRef) { <span class="ref">· {{ it.taskRef.system }}:{{ it.taskRef.id }}</span> }
                  </div>
                  @if (it.blocker) { <div class="ib">{{ it.blocker.detail }}</div> }
                </div>
                <rw-chip [label]="itemLabel(it.state)" [tone]="itemToneOf(it.state)"></rw-chip>
              </div>
            }
          </div>
        </section>

        <section>
          <h2 class="section">Activity</h2>
          <ol class="timeline">
            @for (e of events(); track e.id) {
              <li>
                <span class="axis" [attr.data-actor]="e.actor"></span>
                <div class="ev">
                  <div class="row"><span class="actor" [attr.data-actor]="e.actor">{{ e.actor }}</span><span class="etype">{{ e.type }}</span><span class="grow"></span><span class="at">{{ when(e.at) }}</span></div>
                  <div class="summary">{{ e.summary }}</div>
                </div>
              </li>
            }
          </ol>
        </section>
      </div>
    } @else {
      <div class="body map">
        <rw-process-map [rec]="rec()"></rw-process-map>
      </div>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; height: 100%; min-height: 0; }
    .topinfo { flex: none; padding: 24px 28px 0; }
    .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    h1 { margin: 0; font-size: 1.35rem; letter-spacing: -0.01em; }
    .meta { margin: 4px 0 0; color: var(--muted); font-size: 0.86rem; }
    .pathway { text-transform: capitalize; }

    .confidence { display: flex; align-items: center; gap: 10px; margin: 18px 0 14px; font-size: 0.8rem; color: var(--muted); }
    .bar { flex: 0 0 200px; height: 8px; background: var(--idle-weak); border-radius: 999px; overflow: hidden; }
    .bar > span { display: block; height: 100%; background: var(--ok); border-radius: 999px; }
    .pct { font-weight: 600; color: var(--text); }
    .grow { flex: 1; }
    .deadline.overdue { color: var(--danger); font-weight: 600; }

    .owners { display: flex; gap: 18px; flex-wrap: wrap; padding: 10px 0 4px; font-size: 0.82rem; color: var(--muted); border-top: 1px solid var(--border); }
    .owners b { color: var(--faint); font-weight: 600; margin-right: 5px; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; }

    .blockers { margin: 12px 0; display: flex; flex-direction: column; gap: 8px; }
    .blocker { background: var(--danger-weak); color: #991b1b; border-radius: var(--radius-sm); padding: 9px 12px; font-size: 0.84rem; }
    .blocker .bk { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; margin-right: 8px; opacity: 0.8; }

    .tabs { display: flex; gap: 4px; margin-top: 16px; border-bottom: 1px solid var(--border); }
    .tabs button { border: none; background: transparent; font: inherit; font-size: 0.86rem; color: var(--muted); padding: 8px 12px; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
    .tabs button:hover { color: var(--text); }
    .tabs button.active { color: var(--accent); font-weight: 600; border-bottom-color: var(--accent); }

    .body { flex: 1; min-height: 0; }
    .body.scroll { overflow-y: auto; padding: 0 28px 40px; }
    .body.map { padding: 0; }

    .section { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--faint); margin: 22px 0 10px; }
    .items { display: flex; flex-direction: column; gap: 8px; }
    .item { display: flex; align-items: center; gap: 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 11px 14px; }
    .item .cat { flex: 0 0 82px; font-size: 0.64rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--faint); font-weight: 700; }
    .item .ibody { flex: 1; min-width: 0; }
    .item .label { font-size: 0.9rem; font-weight: 500; }
    .itmeta { font-size: 0.76rem; color: var(--muted); display: flex; gap: 5px; flex-wrap: wrap; margin-top: 2px; }
    .itmeta .ref { font-family: ui-monospace, Menlo, monospace; color: var(--faint); }
    .fulfil { font-weight: 600; }
    .fulfil[data-f="auto"] { color: var(--accent); }
    .fulfil[data-f="agent-assisted"] { color: var(--info); }
    .fulfil[data-f="human"] { color: var(--warn); }
    .ib { font-size: 0.78rem; color: var(--danger); margin-top: 3px; }

    .timeline { list-style: none; margin: 0; padding: 0; }
    .timeline li { display: flex; gap: 12px; }
    .axis { flex: 0 0 8px; position: relative; }
    .axis::before { content: ''; position: absolute; left: 3px; top: 4px; width: 8px; height: 8px; border-radius: 50%; background: var(--idle); }
    .axis::after { content: ''; position: absolute; left: 6px; top: 12px; bottom: -8px; width: 2px; background: var(--border); }
    .timeline li:last-child .axis::after { display: none; }
    .axis[data-actor="agent"]::before { background: var(--accent); }
    .axis[data-actor="human"]::before { background: var(--info); }
    .ev { flex: 1; padding-bottom: 16px; }
    .ev .row { display: flex; align-items: center; gap: 8px; font-size: 0.72rem; color: var(--muted); }
    .actor { text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; font-size: 0.64rem; }
    .actor[data-actor="agent"] { color: var(--accent); }
    .actor[data-actor="human"] { color: var(--info); }
    .actor[data-actor="system"] { color: var(--faint); }
    .etype { font-family: ui-monospace, Menlo, monospace; color: var(--faint); }
    .summary { font-size: 0.86rem; margin-top: 2px; }
  `,
})
export class CaseDetailComponent {
  readonly rec = input.required<ReadinessRecord>();
  readonly #rt = inject(RuntimeService);
  readonly tab = signal<'readiness' | 'flow'>('readiness');

  readonly joinerName = computed(() => maskPersonal(this.rec().joinerName, this.#rt.piiAuthorized()));
  readonly stateLabel = computed(() => READINESS_STATE_LABEL[this.rec().state]);
  readonly tone = computed(() => stateTone(this.rec().state));
  readonly confidencePct = computed(() => Math.round(this.#rt.confidence(this.rec()) * 100));
  readonly overdue = computed(() => this.rec().readinessDeadline < '2026-07-11' && this.rec().state !== 'completed' && this.rec().state !== 'ready-for-day-1');
  readonly events = computed<DomainEvent[]>(() => this.#rt.eventsFor(this.rec().caseRef));

  fulfil(f: Fulfilment): string { return FULFIL_LABEL[f]; }
  itemLabel = (s: Parameters<typeof itemTone>[0]) => ITEM_STATE_LABEL[s];
  itemToneOf = (s: Parameters<typeof itemTone>[0]) => itemTone(s);

  when(iso: string): string {
    return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
