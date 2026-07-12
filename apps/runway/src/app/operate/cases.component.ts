import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { RuntimeService } from '../runtime/runtime.service';
import { ShellService } from '../shell/shell.service';
import { CaseDetailComponent } from './case-detail.component';
import { StateChipComponent, stateTone } from '../shared/state-chip.component';
import { IconComponent } from '../shared/icon.component';
import { maskPersonal } from '../domain/data-dictionary';
import { READINESS_STATE_LABEL, type ReadinessRecord } from '../domain/model';

/** Cases master-detail: pick a case on the left, see its readiness view on the right. */
@Component({
  selector: 'rw-cases',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CaseDetailComponent, StateChipComponent, IconComponent],
  template: `
    <aside class="list">
      <div class="lh">
        <span class="lh-title">Cases</span>
        <span class="n">{{ cases().length }}</span>
      </div>
      @for (c of cases(); track c.caseRef) {
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
      }
    </aside>

    <div class="detail">
      @if (selected(); as s) {
        <rw-case-detail [rec]="s" />
      }
    </div>
  `,
  styles: `
    :host { display: grid; grid-template-columns: 340px 1fr; height: 100%; min-height: 0; }
    .list { border-right: 1px solid var(--border); background: var(--surface); overflow-y: auto; padding: var(--s-8); }
    .lh { display: flex; align-items: center; gap: var(--s-8); padding: var(--s-8) var(--s-10) var(--s-10); }
    .lh-title { font-size: var(--fs-200); text-transform: uppercase; letter-spacing: 0.06em; color: var(--faint); font-weight: var(--fw-bold); }
    .lh .n { background: var(--surface-3); border: 1px solid var(--border); border-radius: var(--radius-pill); padding: 0 var(--s-8); color: var(--muted); font-size: var(--fs-200); font-weight: var(--fw-semibold); }

    .row {
      position: relative; display: flex; align-items: flex-start; gap: var(--s-10); width: 100%; text-align: left;
      background: transparent; border: 1px solid transparent; border-radius: var(--radius); padding: var(--s-10);
      cursor: pointer; margin-bottom: 2px; font: inherit; transition: background 0.1s ease;
    }
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

    .detail { min-width: 0; overflow: hidden; display: flex; flex-direction: column; background: var(--bg); }
    rw-case-detail { flex: 1; min-height: 0; }
  `,
})
export class CasesComponent {
  readonly #rt = inject(RuntimeService);
  readonly #shell = inject(ShellService);
  readonly cases = computed(() => this.#rt.cases());
  readonly selectedRef = computed(() => this.#shell.selectedCaseRef() ?? this.cases()[0]?.caseRef ?? '');
  readonly selected = computed(() => this.#rt.caseByRef(this.selectedRef()) ?? this.cases()[0]);

  select(ref: string): void { this.#shell.selectedCaseRef.set(ref); }
  name(c: ReadinessRecord): string { return maskPersonal(c.joinerName, this.#rt.piiAuthorized()); }
  label(c: ReadinessRecord): string { return READINESS_STATE_LABEL[c.state]; }
  tone(c: ReadinessRecord) { return stateTone(c.state); }
  pct(c: ReadinessRecord): number { return Math.round(this.#rt.confidence(c) * 100); }
}
