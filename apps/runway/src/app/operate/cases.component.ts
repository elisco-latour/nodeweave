import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { RuntimeService } from '../runtime/runtime.service';
import { CaseDetailComponent } from './case-detail.component';
import { StateChipComponent, stateTone } from '../shared/state-chip.component';
import { maskPersonal } from '../domain/data-dictionary';
import { READINESS_STATE_LABEL, type ReadinessRecord } from '../domain/model';

/** Cases master-detail: pick a case on the left, see its readiness view on the right. */
@Component({
  selector: 'rw-cases',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CaseDetailComponent, StateChipComponent],
  template: `
    <aside class="list">
      <div class="lh">Cases <span class="n">{{ cases().length }}</span></div>
      @for (c of cases(); track c.caseRef) {
        <button type="button" class="row" [class.sel]="c.caseRef === selectedRef()" (click)="selectedRef.set(c.caseRef)">
          <div class="r1">
            <span class="joiner">{{ name(c) }}</span>
            <rw-chip [label]="label(c)" [tone]="tone(c)"></rw-chip>
          </div>
          <div class="r2">
            <span class="ref">{{ c.caseRef }}</span>
            <span class="dot">·</span>
            <span class="pathway">{{ c.pathway }}</span>
            <span class="grow"></span>
            <span class="pct">{{ pct(c) }}%</span>
          </div>
        </button>
      }
    </aside>

    <div class="detail">
      @if (selected(); as s) {
        <rw-case-detail [rec]="s"></rw-case-detail>
      }
    </div>
  `,
  styles: `
    :host { display: grid; grid-template-columns: 320px 1fr; height: 100%; min-height: 0; }
    .list { border-right: 1px solid var(--border); background: var(--surface); overflow-y: auto; padding: 12px; }
    .lh { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--faint); font-weight: 700; padding: 6px 8px 10px; display: flex; gap: 8px; align-items: center; }
    .lh .n { background: var(--surface-2); border: 1px solid var(--border); border-radius: 999px; padding: 0 7px; color: var(--muted); }
    .row { display: block; width: 100%; text-align: left; background: transparent; border: 1px solid transparent; border-radius: var(--radius-sm); padding: 10px 10px; cursor: pointer; margin-bottom: 2px; font: inherit; }
    .row:hover { background: var(--surface-2); }
    .row.sel { background: var(--accent-weak); border-color: #c7d2fe; }
    .r1 { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .joiner { font-size: 0.9rem; font-weight: 600; color: var(--text); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .r2 { display: flex; align-items: center; gap: 6px; margin-top: 4px; font-size: 0.74rem; color: var(--muted); }
    .r2 .ref { font-weight: 600; }
    .r2 .pathway { text-transform: capitalize; }
    .r2 .grow { flex: 1; }
    .r2 .pct { color: var(--faint); }
    .detail { min-width: 0; overflow: hidden; display: flex; flex-direction: column; }
    rw-case-detail { flex: 1; min-height: 0; }
  `,
})
export class CasesComponent {
  readonly #rt = inject(RuntimeService);
  readonly cases = computed(() => this.#rt.cases());
  readonly selectedRef = signal(this.#rt.cases()[0]?.caseRef ?? '');
  readonly selected = computed(() => this.#rt.caseByRef(this.selectedRef()) ?? this.cases()[0]);

  name(c: ReadinessRecord): string { return maskPersonal(c.joinerName, this.#rt.piiAuthorized()); }
  label(c: ReadinessRecord): string { return READINESS_STATE_LABEL[c.state]; }
  tone(c: ReadinessRecord) { return stateTone(c.state); }
  pct(c: ReadinessRecord): number { return Math.round(this.#rt.confidence(c) * 100); }
}
