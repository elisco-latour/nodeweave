import { Component, ChangeDetectionStrategy, computed, inject, output, signal } from '@angular/core';
import { RuntimeService, type NewCaseInput } from '../runtime/runtime.service';
import { ProcessStore } from '../runtime/process-store';
import { IconComponent } from '../shared/icon.component';
import type { Pathway, RequestType } from '../domain/model';

const REQUEST_TYPES: { value: RequestType; label: string }[] = [
  { value: 'new', label: 'New joiner' },
  { value: 'update', label: 'Update' },
  { value: 'exception', label: 'Exception' },
];

const STEP_LABELS = ['Request', 'Joiner', 'Timing', 'Review'];

/**
 * New-case intake wizard — a multi-step structured-intake form. This IS the
 * "approved structured intake": explicit fields, an explicit request type, and
 * validation — never free-form text. On submit it calls the mock runtime's
 * createCase (the stand-in for POST /intake).
 */
@Component({
  selector: 'rw-intake-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="scrim" (click)="close.emit()"></div>
    <div class="dialog" role="dialog" aria-modal="true" aria-label="New onboarding case">
      <header>
        <div class="htext">
          <span class="eyebrow">Structured intake</span>
          <h2>New onboarding case</h2>
        </div>
        <button type="button" class="x" (click)="close.emit()" aria-label="Cancel"><rw-icon name="dismiss" [size]="18" /></button>
      </header>

      <ol class="steps">
        @for (label of stepLabels; track label; let i = $index) {
          <li [class.on]="i === step()" [class.done]="i < step()">
            <span class="num">@if (i < step()) { <rw-icon name="check" [size]="13" /> } @else { {{ i + 1 }} }</span>
            <span class="slabel">{{ label }}</span>
          </li>
        }
      </ol>

      <div class="body">
        @switch (step()) {
          @case (0) {
            <div class="grid">
              <div class="field span2">
                <label>Onboarding pathway</label>
                <div class="seg">
                  <button type="button" [class.on]="pathway() === 'centre-level'" (click)="pathway.set('centre-level')">Centre-level</button>
                  <button type="button" [class.on]="pathway() === 'project-level'" (click)="pathway.set('project-level')">Project-level</button>
                </div>
              </div>
              <div class="field span2">
                <label>Request type</label>
                <div class="chips">
                  @for (rt of requestTypes; track rt.value) {
                    <button type="button" class="chip" [class.on]="requestType() === rt.value" (click)="requestType.set(rt.value)">{{ rt.label }}</button>
                  }
                </div>
              </div>
              <div class="note span2">
                <rw-icon name="info" [size]="15" />
                <span>Submitting via <b>Runway intake form</b> (schema <b>v2</b>) — a governed, structured source. This will validate against <b>{{ processLabel() }}</b>.</span>
              </div>
            </div>
          }
          @case (1) {
            <div class="grid">
              <div class="field span2" [class.err]="err('joinerName')">
                <label>Full name <span class="req">*</span></label>
                <input type="text" [value]="joinerName()" (input)="set('joinerName', $event)" placeholder="e.g. Aïsha Bello" />
                @if (err('joinerName')) { <span class="msg">Required</span> }
              </div>
              <div class="field" [class.err]="err('joinerRef')">
                <label>Employee ID (EID) <span class="req">*</span></label>
                <input type="text" [value]="joinerRef()" (input)="set('joinerRef', $event)" placeholder="e.g. J-88431" />
                @if (err('joinerRef')) { <span class="msg">Required — the validation gate needs a valid EID</span> }
              </div>
              <div class="field" [class.err]="err('role')">
                <label>Role <span class="req">*</span></label>
                <input type="text" [value]="role()" (input)="set('role', $event)" placeholder="e.g. Analyst" />
                @if (err('role')) { <span class="msg">Required</span> }
              </div>
              <div class="field span2" [class.err]="err('location')">
                <label>Location <span class="req">*</span></label>
                <input type="text" [value]="location()" (input)="set('location', $event)" placeholder="e.g. Ebène, MU" />
                @if (err('location')) { <span class="msg">Required</span> }
              </div>
            </div>
          }
          @case (2) {
            <div class="grid">
              <div class="field" [class.err]="err('startDate')">
                <label>Start date (Day 1) <span class="req">*</span></label>
                <input type="date" [value]="startDate()" (input)="onStart($event)" />
                @if (err('startDate')) { <span class="msg">Required</span> }
              </div>
              <div class="field" [class.err]="err('readinessDeadline')">
                <label>Ready by <span class="req">*</span></label>
                <input type="date" [value]="readinessDeadline()" (input)="set('readinessDeadline', $event)" />
                @if (err('readinessDeadline')) { <span class="msg">Required</span> }
              </div>
              <div class="note span2">
                <rw-icon name="clock" [size]="15" />
                <span>The readiness deadline defaults to two days before Day 1. Adjust if your centre needs more lead time.</span>
              </div>
            </div>
          }
          @case (3) {
            @if (duplicate(); as dup) {
              <div class="warn">
                <rw-icon name="warning" [size]="16" />
                <span>An active case already exists for EID <b>{{ joinerRef() }}</b> ({{ dup.caseRef }} — {{ dup.role }}). Creating this will make a second record. Cancel unless this is intentional.</span>
              </div>
            }
            <div class="review">
              <div class="rrow"><span class="rk">Pathway</span><span class="rv">{{ pathwayLabel() }}</span></div>
              <div class="rrow"><span class="rk">Request</span><span class="rv">{{ requestLabel() }}</span></div>
              <div class="rrow"><span class="rk">Name</span><span class="rv">{{ joinerName() }}</span></div>
              <div class="rrow"><span class="rk">EID</span><span class="rv">{{ joinerRef() }}</span></div>
              <div class="rrow"><span class="rk">Role</span><span class="rv">{{ role() }}</span></div>
              <div class="rrow"><span class="rk">Location</span><span class="rv">{{ location() }}</span></div>
              <div class="rrow"><span class="rk">Day 1</span><span class="rv">{{ startDate() || '—' }}</span></div>
              <div class="rrow"><span class="rk">Ready by</span><span class="rv">{{ readinessDeadline() || '—' }}</span></div>
              <div class="rrow"><span class="rk">Process</span><span class="rv mono">{{ processLabel() }}</span></div>
            </div>
            <div class="note span2">
              <rw-icon name="check-circle" [size]="15" />
              <span>On create, Runway validates the intake and hands the case to the agent for orchestration — you’ll supervise the rest from Cases and the Inbox.</span>
            </div>
          }
        }
      </div>

      <footer>
        @if (step() > 0) { <button type="button" class="btn ghost" (click)="back()"><rw-icon name="chevron-right" [size]="16" class="flip" />Back</button> }
        <span class="grow"></span>
        <span class="progress">Step {{ step() + 1 }} of {{ stepLabels.length }}</span>
        @if (step() < 3) {
          <button type="button" class="btn primary" (click)="next()">Next<rw-icon name="chevron-right" [size]="16" /></button>
        } @else {
          <button type="button" class="btn primary" (click)="create()"><rw-icon name="add" [size]="16" />Create case</button>
        }
      </footer>
    </div>
  `,
  styles: `
    :host { position: fixed; inset: 0; z-index: 200; }
    .scrim { position: absolute; inset: 0; background: rgba(48, 0, 77, 0.42); backdrop-filter: blur(2px); animation: fade 0.15s ease; }
    .dialog {
      position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
      width: min(560px, calc(100vw - 32px)); max-height: calc(100vh - 48px); display: flex; flex-direction: column;
      background: var(--surface); border-radius: var(--radius-xl); box-shadow: var(--shadow-28);
      animation: pop 0.18s cubic-bezier(0.2, 0.9, 0.3, 1.2); overflow: hidden;
    }
    header { display: flex; align-items: flex-start; justify-content: space-between; padding: var(--s-20) var(--s-24) var(--s-12); }
    .eyebrow { font-size: var(--fs-100); text-transform: uppercase; letter-spacing: 0.08em; font-weight: var(--fw-bold); color: var(--accent); }
    h2 { margin: 2px 0 0; font-family: var(--font-display); font-size: var(--fs-500); font-weight: var(--fw-bold); letter-spacing: -0.02em; }
    .x { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: none; background: transparent; color: var(--faint); border-radius: var(--radius-sm); cursor: pointer; }
    .x:hover { background: var(--surface-3); color: var(--muted); }

    .steps { display: flex; gap: var(--s-8); list-style: none; margin: 0; padding: 0 var(--s-24) var(--s-16); }
    .steps li { display: flex; align-items: center; gap: var(--s-6); flex: 1; color: var(--faint); font-size: var(--fs-200); font-weight: var(--fw-semibold); }
    .steps .num { display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: var(--surface-3); color: var(--muted); font-size: var(--fs-100); border: 1px solid var(--border); }
    .steps li.on { color: var(--accent); }
    .steps li.on .num { background: var(--brand); color: #fff; border-color: transparent; }
    .steps li.done .num { background: var(--accent-weak); color: var(--accent); border-color: transparent; }
    .slabel { white-space: nowrap; }

    .body { padding: var(--s-4) var(--s-24) var(--s-8); overflow-y: auto; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-16); }
    .span2 { grid-column: 1 / -1; }
    .field { display: flex; flex-direction: column; gap: var(--s-6); }
    .field label { font-size: var(--fs-200); font-weight: var(--fw-semibold); color: var(--text); }
    .req { color: var(--danger); }
    .field input {
      width: 100%; box-sizing: border-box; height: 34px; padding: 0 var(--s-12);
      border: 1px solid var(--border-strong); border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-300);
      background: var(--surface); color: var(--text);
    }
    .field input:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px var(--accent-weak-2); }
    .field.err input { border-color: var(--danger); }
    .field .msg { font-size: var(--fs-100); color: var(--danger); font-weight: var(--fw-medium); }

    .seg { display: inline-flex; background: var(--surface-3); border: 1px solid var(--border); border-radius: var(--radius-pill); padding: 2px; width: fit-content; }
    .seg button { border: none; background: transparent; font: inherit; font-size: var(--fs-200); font-weight: var(--fw-semibold); color: var(--muted); padding: 6px 18px; border-radius: var(--radius-pill); cursor: pointer; }
    .seg button.on { background: var(--brand); color: #fff; }
    .chips { display: flex; gap: var(--s-6); }
    .chip { border: 1px solid var(--border-strong); background: var(--surface); color: var(--muted); font: inherit; font-size: var(--fs-200); font-weight: var(--fw-semibold); padding: 6px 14px; border-radius: var(--radius-pill); cursor: pointer; }
    .chip.on { background: var(--accent-weak); border-color: var(--accent-border); color: var(--accent); }

    .note { display: flex; align-items: flex-start; gap: var(--s-8); padding: var(--s-10) var(--s-12); background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius); font-size: var(--fs-200); color: var(--muted); line-height: 1.45; }
    .note rw-icon { color: var(--accent); flex: none; margin-top: 1px; }
    .warn { display: flex; align-items: flex-start; gap: var(--s-8); margin-bottom: var(--s-12); padding: var(--s-10) var(--s-12); background: var(--warn-weak); border: 1px solid #f4d3af; border-radius: var(--radius); font-size: var(--fs-200); color: var(--warn); line-height: 1.45; }
    .warn rw-icon { flex: none; margin-top: 1px; }

    .review { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-8) var(--s-16); margin-bottom: var(--s-12); }
    .rrow { display: flex; flex-direction: column; gap: 1px; padding: var(--s-8) var(--s-12); background: var(--surface-2); border-radius: var(--radius-sm); }
    .rk { font-size: var(--fs-100); text-transform: uppercase; letter-spacing: 0.05em; color: var(--faint); font-weight: var(--fw-bold); }
    .rv { font-size: var(--fs-300); font-weight: var(--fw-semibold); }
    .rv.mono { font-family: var(--font-mono); font-weight: var(--fw-regular); }

    footer { display: flex; align-items: center; gap: var(--s-12); padding: var(--s-16) var(--s-24); border-top: 1px solid var(--border); }
    .grow { flex: 1; }
    .progress { font-size: var(--fs-200); color: var(--faint); }
    .btn { display: inline-flex; align-items: center; gap: var(--s-4); padding: var(--s-8) var(--s-16); border: 1px solid transparent; border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-300); font-weight: var(--fw-semibold); cursor: pointer; }
    .btn.ghost { background: transparent; color: var(--muted); border-color: var(--border-strong); }
    .btn.ghost:hover { background: var(--surface-3); color: var(--text); }
    .btn.primary { background: var(--brand); color: #fff; }
    .btn.primary:hover { background: var(--brand-hover); }
    .flip { transform: rotate(180deg); }

    @keyframes fade { from { opacity: 0; } }
    @keyframes pop { from { opacity: 0; transform: translate(-50%, -46%) scale(0.97); } }
    @media (max-width: 560px) { .grid, .review { grid-template-columns: 1fr; } }
  `,
})
export class IntakeWizardComponent {
  readonly close = output<void>();
  readonly created = output<string>();

  readonly #rt = inject(RuntimeService);
  readonly #store = inject(ProcessStore);
  readonly requestTypes = REQUEST_TYPES;
  readonly stepLabels = STEP_LABELS;

  readonly step = signal(0);
  readonly showErrors = signal(false);

  readonly pathway = signal<Pathway>('centre-level');
  readonly requestType = signal<RequestType>('new');
  readonly joinerName = signal('');
  readonly joinerRef = signal('');
  readonly role = signal('');
  readonly location = signal('Ebène, MU');
  readonly startDate = signal('');
  readonly readinessDeadline = signal('');

  readonly pathwayLabel = computed(() => (this.pathway() === 'centre-level' ? 'Centre-level' : 'Project-level'));
  readonly requestLabel = computed(() => REQUEST_TYPES.find((r) => r.value === this.requestType())?.label ?? '');
  readonly processLabel = computed(() => {
    const name = this.pathway() === 'centre-level' ? 'centre-onboarding' : 'project-onboarding';
    const v = this.#store.published(this.pathway())?.version ?? 1;
    return `${name}@${v}`;
  });
  readonly duplicate = computed(() => this.#rt.openCaseForJoiner(this.joinerRef()));

  readonly #step1Valid = computed(() =>
    !!this.joinerName().trim() && !!this.joinerRef().trim() && !!this.role().trim() && !!this.location().trim());
  readonly #step2Valid = computed(() => !!this.startDate() && !!this.readinessDeadline());

  set(field: 'joinerName' | 'joinerRef' | 'role' | 'location' | 'readinessDeadline', ev: Event): void {
    this[field].set((ev.target as HTMLInputElement).value);
  }

  onStart(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this.startDate.set(v);
    if (v && !this.readinessDeadline()) {
      const d = new Date(v);
      d.setDate(d.getDate() - 2);
      this.readinessDeadline.set(d.toISOString().slice(0, 10));
    }
  }

  err(field: 'joinerName' | 'joinerRef' | 'role' | 'location' | 'startDate' | 'readinessDeadline'): boolean {
    return this.showErrors() && !this[field]().trim();
  }

  #stepValid(i: number): boolean {
    return i === 1 ? this.#step1Valid() : i === 2 ? this.#step2Valid() : true;
  }

  next(): void {
    if (!this.#stepValid(this.step())) { this.showErrors.set(true); return; }
    this.showErrors.set(false);
    this.step.update((s) => Math.min(3, s + 1));
  }

  back(): void {
    this.showErrors.set(false);
    this.step.update((s) => Math.max(0, s - 1));
  }

  create(): void {
    const input: NewCaseInput = {
      pathway: this.pathway(),
      requestType: this.requestType(),
      processVersion: this.processLabel(),
      joinerName: this.joinerName(),
      joinerRef: this.joinerRef(),
      role: this.role(),
      location: this.location(),
      startDate: this.startDate(),
      readinessDeadline: this.readinessDeadline(),
      intakeSource: 'Runway intake form',
      schemaVersion: 'v2',
    };
    this.created.emit(this.#rt.createCase(input));
  }
}
