import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { Node } from '@nodeweave/angular';
import { IconComponent, type IconName } from '../shared/icon.component';
import type { RunState, NodeKind } from './process-graph';

const RUN_LABEL: Record<RunState, string> = {
  done: 'Done', active: 'In progress', awaiting: 'Awaiting human',
  blocked: 'Blocked', pending: 'Pending', skipped: 'N/A',
};

const KIND_ICON: Record<NodeKind, IconName> = {
  trigger: 'play', gate: 'split', wait: 'hourglass', item: 'circle',
  action: 'flash', task: 'person', monitor: 'sync', notify: 'mail', done: 'flag',
};

const TICK_ICON: Partial<Record<RunState, IconName>> = {
  done: 'check', blocked: 'error-circle', awaiting: 'clock', active: 'sync',
};

/** Read-only node on the case process map. Lit by the case's readiness state. */
@Component({
  selector: 'rw-process-node',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="pn" [attr.data-run]="run()">
      <span class="rail"></span>
      <div class="body">
        <div class="label">{{ label() }}</div>
        <div class="meta"><span class="glyph"><rw-icon [name]="glyph()" [size]="13" /></span>{{ runLabel() }}</div>
      </div>
      @if (tick(); as t) { <span class="tick"><rw-icon [name]="t" [size]="15" /></span> }
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .pn {
      height: 100%; box-sizing: border-box; display: flex; align-items: stretch; overflow: hidden;
      border-radius: inherit; font-family: var(--font);
      box-shadow: inset 0 0 0 1px var(--tone-line, transparent);
    }
    .rail { flex: none; width: 5px; background: var(--tone, #9a95a4); }
    .body { flex: 1; min-width: 0; padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; justify-content: center; }
    .label { font-size: 0.8rem; font-weight: 600; color: #242130; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .meta { font-size: 0.68rem; color: var(--tone, #655f72); display: flex; align-items: center; gap: 5px; }
    .glyph { display: inline-flex; opacity: 0.85; }
    .tick { align-self: center; display: inline-flex; padding-right: 10px; color: var(--tone, #9a95a4); }

    .pn[data-run="done"]    { --tone: #107c10; --tone-line: #bce0bd; }
    .pn[data-run="active"]  { --tone: #7500c0; --tone-line: #e0bdff; }
    .pn[data-run="awaiting"]{ --tone: #bc4b09; --tone-line: #f4d3af; }
    .pn[data-run="blocked"] { --tone: #c50f1f; --tone-line: #f3bcbc; }
    .pn[data-run="pending"] { --tone: #9a95a4; --tone-line: #e2dfe7; }
    .pn[data-run="skipped"] { --tone: #c4c0cc; --tone-line: #eeecf1; opacity: 0.6; }
  `,
})
export class ProcessNodeComponent {
  readonly node = input.required<Node>();

  readonly #cfg = computed(() => (this.node().metadata.config ?? {}) as { kind: NodeKind; label: string; runState: RunState });
  readonly label = computed(() => this.#cfg().label);
  readonly run = computed(() => this.#cfg().runState);
  readonly runLabel = computed(() => RUN_LABEL[this.run()]);
  readonly glyph = computed<IconName>(() => KIND_ICON[this.#cfg().kind]);
  readonly tick = computed<IconName | undefined>(() => TICK_ICON[this.run()]);
}
