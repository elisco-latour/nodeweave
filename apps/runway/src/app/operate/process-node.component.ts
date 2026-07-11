import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { Node } from '@nodeweave/angular';
import type { RunState, NodeKind } from './process-graph';

const RUN_LABEL: Record<RunState, string> = {
  done: 'Done', active: 'In progress', awaiting: 'Awaiting human',
  blocked: 'Blocked', pending: 'Pending', skipped: 'N/A',
};

const KIND_GLYPH: Record<NodeKind, string> = {
  trigger: '▶', gate: '◇', wait: '⏳', item: '•',
  action: '⚙', task: '☑', monitor: '⟳', notify: '✉', done: '⚑',
};

/** Read-only node on the case process map. Lit by the case's readiness state. */
@Component({
  selector: 'rw-process-node',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pn" [attr.data-run]="run()">
      <span class="rail"></span>
      <div class="body">
        <div class="label">{{ label() }}</div>
        <div class="meta"><span class="glyph">{{ glyph() }}</span>{{ runLabel() }}</div>
      </div>
      <span class="tick">{{ tick() }}</span>
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .pn {
      height: 100%; box-sizing: border-box; display: flex; align-items: stretch; overflow: hidden;
      border-radius: inherit; font-family: system-ui, -apple-system, sans-serif;
      box-shadow: inset 0 0 0 1px var(--tone-line, transparent);
    }
    .rail { flex: none; width: 5px; background: var(--tone, #94a3b8); }
    .body { flex: 1; min-width: 0; padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; justify-content: center; }
    .label { font-size: 0.8rem; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .meta { font-size: 0.68rem; color: var(--tone, #64748b); display: flex; align-items: center; gap: 5px; }
    .glyph { opacity: 0.8; }
    .tick { align-self: center; padding-right: 10px; font-size: 0.8rem; font-weight: 700; color: var(--tone, #94a3b8); }

    .pn[data-run="done"]    { --tone: #16a34a; --tone-line: #bbf7d0; }
    .pn[data-run="active"]  { --tone: #4f46e5; --tone-line: #c7d2fe; }
    .pn[data-run="awaiting"]{ --tone: #d97706; --tone-line: #fde68a; }
    .pn[data-run="blocked"] { --tone: #dc2626; --tone-line: #fecaca; }
    .pn[data-run="pending"] { --tone: #94a3b8; --tone-line: #e5e7eb; }
    .pn[data-run="skipped"] { --tone: #cbd5e1; --tone-line: #eef1f4; opacity: 0.6; }
  `,
})
export class ProcessNodeComponent {
  readonly node = input.required<Node>();

  readonly #cfg = computed(() => (this.node().metadata.config ?? {}) as { kind: NodeKind; label: string; runState: RunState });
  readonly label = computed(() => this.#cfg().label);
  readonly run = computed(() => this.#cfg().runState);
  readonly runLabel = computed(() => RUN_LABEL[this.run()]);
  readonly glyph = computed(() => KIND_GLYPH[this.#cfg().kind]);
  readonly tick = computed(() => {
    switch (this.run()) {
      case 'done': return '✓';
      case 'blocked': return '!';
      case 'awaiting': return '⏳';
      case 'active': return '●';
      default: return '';
    }
  });
}
