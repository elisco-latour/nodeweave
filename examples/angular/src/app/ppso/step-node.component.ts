import { Component, ChangeDetectionStrategy, computed, inject, input } from '@angular/core';
import { Node, VisualCanvasService } from '@nodeweave/angular';

/** Category presentation derived from the node type's prefix (`trigger.*`, …). */
const CATEGORIES: Record<string, { color: string; icon: string; label: string }> = {
  trigger: { color: '#16a34a', icon: '▶', label: 'Trigger' },
  gate: { color: '#d97706', icon: '◈', label: 'Gate' },
  wait: { color: '#64748b', icon: '⏳', label: 'Wait' },
  action: { color: '#4f46e5', icon: '⚙', label: 'Automated' },
  task: { color: '#7c3aed', icon: '☑', label: 'Agent task' },
  control: { color: '#0d9488', icon: '⑃', label: 'Control' },
  monitor: { color: '#e11d48', icon: '⟳', label: 'Monitor' },
  notify: { color: '#0284c7', icon: '✉', label: 'Notify' },
};

const FALLBACK = { color: '#64748b', icon: '▪', label: 'Step' };

/**
 * Generic renderer for every process step. Colour + icon come from the node
 * type's category prefix, the title + a couple of config values from its config
 * — so one component draws the whole vocabulary.
 */
@Component({
  selector: 'app-step-node',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="step" [style.--accent]="cat().color"
         [class.pp-added]="proposed() === 'added'"
         [class.pp-updated]="proposed() === 'updated'"
         [class.pp-removed]="proposed() === 'removed'">
      @if (proposed(); as p) {
        <span class="pp-badge">{{ p === 'added' ? '＋ new' : p === 'removed' ? '－ remove' : '✎ edit' }}</span>
      }
      <span class="rail"></span>
      <div class="body">
        <div class="head">
          <span class="icon">{{ cat().icon }}</span>
          <input
            class="title"
            [value]="title()"
            (pointerdown)="$event.stopPropagation()"
            (change)="setTitle($any($event.target).value)"
            aria-label="Step title"
          />
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
    .step {
      position: relative; height: 100%; box-sizing: border-box;
      display: flex; overflow: hidden; border-radius: inherit;
      font-family: system-ui, -apple-system, sans-serif; color: #0f172a;
    }
    .rail { flex: none; width: 5px; background: var(--accent, #64748b); }
    .body { flex: 1; min-width: 0; padding: 8px 11px; display: flex; flex-direction: column; gap: 3px; }
    .head { display: flex; align-items: center; gap: 7px; }
    .icon {
      flex: none; width: 20px; height: 20px; display: grid; place-items: center;
      border-radius: 6px; font-size: 0.78rem; color: #fff; background: var(--accent, #64748b);
    }
    .title {
      flex: 1; min-width: 0; font-weight: 700; font-size: 0.82rem; color: #0f172a;
      border: 1px solid transparent; border-radius: 5px; background: transparent;
      padding: 1px 4px; margin: -1px -4px; font-family: inherit;
    }
    .title:hover { border-color: #e2e8f0; }
    .title:focus { outline: none; border-color: var(--accent, #6366f1); background: #fff; }
    .kind { font-size: 0.64rem; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; }
    .kind .sub { color: #cbd5e1; text-transform: none; letter-spacing: 0; }
    .param { display: flex; gap: 6px; font-size: 0.68rem; line-height: 1.3; }
    .param .k { color: #94a3b8; flex: none; }
    .param .v { color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* Copilot proposal preview states */
    .pp-badge {
      position: absolute; top: -9px; right: 8px; z-index: 2;
      font-size: 0.6rem; font-weight: 700; padding: 1px 7px; border-radius: 999px; color: #fff;
    }
    .step.pp-added { outline: 2px dashed #4f46e5; outline-offset: 1px; }
    .step.pp-added .pp-badge { background: #4f46e5; }
    .step.pp-updated { outline: 2px dashed #d97706; outline-offset: 1px; }
    .step.pp-updated .pp-badge { background: #d97706; }
    .step.pp-removed { outline: 2px dashed #dc2626; outline-offset: 1px; opacity: 0.55; }
    .step.pp-removed .pp-badge { background: #dc2626; }
    .step.pp-removed .title { text-decoration: line-through; }
  `,
})
export class StepNodeComponent {
  readonly node = input.required<Node>();
  readonly #svc = inject(VisualCanvasService);

  readonly cfg = computed<Record<string, unknown>>(() => {
    this.#svc.configTick();
    return (this.node().metadata.config ?? {}) as Record<string, unknown>;
  });

  readonly cat = computed(() => CATEGORIES[this.node().type.split('.')[0]] ?? FALLBACK);
  readonly subtype = computed(() => this.node().type.split('.')[1] ?? '');
  readonly title = computed(() => (this.cfg()['title'] as string) || this.node().type);
  readonly proposed = computed(() => this.cfg()['__proposed'] as string | undefined);

  readonly preview = computed(() =>
    Object.entries(this.cfg())
      .filter(([k, v]) => k !== 'title' && !k.startsWith('__') && v !== '' && v != null)
      .slice(0, 2)
      .map(([k, v]) => {
        const s = String(v);
        return { k, v: s.length > 30 ? s.slice(0, 29) + '…' : s };
      }),
  );

  setTitle(value: string): void {
    this.#svc.updateNodeConfig(this.node().id, { title: value });
  }
}
