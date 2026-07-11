import {
  Component, ChangeDetectionStrategy, ViewEncapsulation, Type,
  afterNextRender, effect, inject, input, viewChild,
} from '@angular/core';
import { VisualCanvasComponent } from '@nodeweave/angular';
import type { ReadinessRecord } from '../domain/model';
import { ProcessStore } from '../runtime/process-store';
import { buildCaseMap } from './process-graph';
import { ProcessNodeComponent } from './process-node.component';

/**
 * Read-only process map for a case: the published process rendered with
 * nodeweave, lit by the case's readiness state. Pan/zoom only — nodes are
 * non-interactive (pointer-events disabled) so it reads as a live map, not an
 * editor. Rebuilds when the selected case changes.
 */
@Component({
  selector: 'rw-process-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [VisualCanvasComponent],
  template: `
    <div class="rw-map">
      <nodeweave #cv background="dots" [backgroundGap]="20" [nodeTypes]="nodeTypes" [nodesResizable]="false"></nodeweave>
      <div class="legend">
        <span><i class="d done"></i> done</span>
        <span><i class="d active"></i> in progress</span>
        <span><i class="d awaiting"></i> awaiting human</span>
        <span><i class="d blocked"></i> blocked</span>
        <span><i class="d pending"></i> pending</span>
      </div>
    </div>
  `,
  styles: `
    .rw-map { position: relative; height: 100%; min-height: 0; }
    .rw-map nodeweave {
      display: block; width: 100%; height: 100%;
      --nw-bg-color: #f6f7f9;
      --nw-bg-pattern: #dfe3e9;
      --nw-node-bg: #ffffff;
      --nw-node-border: #e6e8ec;
      --nw-node-radius: 10px;
      --nw-edge-color: #cbd5e1;
      --nw-port-color: #cbd5e1;
      --nw-port-border-color: #b6bcc6;
    }
    /* Read-only: nodes are non-interactive; the surface still pans/zooms. */
    .rw-map .vc-node { pointer-events: none; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.07); }
    .rw-map path.vc-edge.rw-edge-done { stroke: #22c55e; stroke-width: 2; }

    .legend {
      position: absolute; left: 12px; bottom: 12px; z-index: 40;
      display: flex; flex-wrap: wrap; gap: 10px;
      background: rgba(255, 255, 255, 0.92); border: 1px solid var(--border);
      border-radius: 9px; padding: 7px 11px; font-size: 0.7rem; color: var(--muted);
      box-shadow: var(--shadow-sm);
    }
    .legend span { display: inline-flex; align-items: center; gap: 5px; }
    .legend .d { width: 8px; height: 8px; border-radius: 2px; }
    .legend .done { background: #16a34a; }
    .legend .active { background: #4f46e5; }
    .legend .awaiting { background: #d97706; }
    .legend .blocked { background: #dc2626; }
    .legend .pending { background: #94a3b8; }
  `,
})
export class ProcessMapComponent {
  readonly rec = input.required<ReadinessRecord>();
  readonly cvRef = viewChild(VisualCanvasComponent);
  readonly #store = inject(ProcessStore);

  readonly nodeTypes: Record<string, Type<unknown>> = { step: ProcessNodeComponent };

  constructor() {
    // Rebuild when the canvas is ready, the case changes, or a new process is published.
    effect(() => {
      const cv = this.cvRef();
      const rec = this.rec();
      if (!cv || !rec) return;
      const published = this.#store.published(rec.pathway);
      buildCaseMap(cv.service, rec, published?.graph);
    });
    afterNextRender(() => this.#fit());
  }

  /** Best-effort auto-fit via the built-in controls (harmless if unavailable). */
  #fit(): void {
    setTimeout(() => {
      try {
        const controls = document.querySelector('rw-process-map canvas-controls') as HTMLElement & { shadowRoot: ShadowRoot } | null;
        const btn = controls?.shadowRoot?.querySelector('button[aria-label="Fit view"]') as HTMLButtonElement | null;
        btn?.click();
      } catch { /* no-op */ }
    }, 60);
  }
}
