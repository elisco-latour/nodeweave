import { Component, ChangeDetectionStrategy, computed, inject, input } from '@angular/core';
import { Node, VisualCanvasService } from '@nodeweave/angular';

const CATS: Record<string, { color: string; icon: string; label: string }> = {
  trigger: { color: '#16a34a', icon: '▶', label: 'Trigger' },
  gate: { color: '#d97706', icon: '◇', label: 'Gate' },
  wait: { color: '#64748b', icon: '⏳', label: 'Wait' },
  action: { color: '#4f46e5', icon: '⚙', label: 'Automated' },
  task: { color: '#7c3aed', icon: '☑', label: 'Agent task' },
  monitor: { color: '#e11d48', icon: '⟳', label: 'Monitor' },
  notify: { color: '#0284c7', icon: '✉', label: 'Notify' },
};
const FALLBACK = { color: '#94a3b8', icon: '▪', label: 'Step' };

/** Editable process step on the Compose canvas. Colour/icon from the type prefix. */
@Component({
  selector: 'rw-step-node',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="step" [style.--accent]="cat().color">
      <span class="rail"></span>
      <div class="body">
        <div class="head">
          <span class="icon">{{ cat().icon }}</span>
          <input class="title" [value]="title()" (pointerdown)="$event.stopPropagation()"
                 (change)="setTitle($any($event.target).value)" aria-label="Step title" />
        </div>
        <div class="kind">{{ cat().label }}@if (subtype()) {<span class="sub"> · {{ subtype() }}</span>}</div>
        @for (row of preview(); track row.k) {
          <div class="param"><span class="k">{{ row.k }}</span><span class="v">{{ row.v }}</span></div>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .step { position: relative; height: 100%; box-sizing: border-box; display: flex; overflow: hidden; border-radius: inherit; font-family: system-ui, -apple-system, sans-serif; color: #0f172a; }
    .rail { flex: none; width: 5px; background: var(--accent, #64748b); }
    .body { flex: 1; min-width: 0; padding: 8px 11px; display: flex; flex-direction: column; gap: 3px; }
    .head { display: flex; align-items: center; gap: 7px; }
    .icon { flex: none; width: 20px; height: 20px; display: grid; place-items: center; border-radius: 6px; font-size: 0.78rem; color: #fff; background: var(--accent, #64748b); }
    .title { flex: 1; min-width: 0; font-weight: 700; font-size: 0.82rem; color: #0f172a; border: 1px solid transparent; border-radius: 5px; background: transparent; padding: 1px 4px; margin: -1px -4px; font-family: inherit; }
    .title:hover { border-color: #e6e8ec; }
    .title:focus { outline: none; border-color: var(--accent, #4f46e5); background: #fff; }
    .kind { font-size: 0.64rem; text-transform: uppercase; letter-spacing: 0.05em; color: #98a2b3; }
    .kind .sub { color: #cbd5e1; text-transform: none; letter-spacing: 0; }
    .param { display: flex; gap: 6px; font-size: 0.68rem; line-height: 1.3; }
    .param .k { color: #98a2b3; flex: none; }
    .param .v { color: #667085; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  `,
})
export class StepNodeComponent {
  readonly node = input.required<Node>();
  readonly #svc = inject(VisualCanvasService);

  readonly cfg = computed<Record<string, unknown>>(() => {
    this.#svc.configTick();
    return (this.node().metadata.config ?? {}) as Record<string, unknown>;
  });
  readonly cat = computed(() => CATS[this.node().type.split('.')[0]] ?? FALLBACK);
  readonly subtype = computed(() => this.node().type.split('.')[1] ?? '');
  readonly title = computed(() => (this.cfg()['title'] as string) || this.node().type);
  readonly preview = computed(() =>
    Object.entries(this.cfg())
      .filter(([k, v]) => k !== 'title' && v !== '' && v != null)
      .slice(0, 2)
      .map(([k, v]) => { const s = String(v); return { k, v: s.length > 30 ? s.slice(0, 29) + '…' : s }; }),
  );

  setTitle(value: string): void {
    this.#svc.updateNodeConfig(this.node().id, { title: value });
  }
}
