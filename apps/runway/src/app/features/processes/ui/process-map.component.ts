import {
  Component, ChangeDetectionStrategy, ViewEncapsulation, Type,
  afterNextRender, effect, inject, input, viewChild,
} from '@angular/core';
import { VisualCanvasComponent } from '@nodeweave/angular';
import type { ReadinessRecord } from '../../../domain/model';
import { ProcessStore } from '../../../runtime/process-store';
import { buildCaseMap } from './process-graph';
import { ProcessNodeComponent } from './process-node.component';

/**
 * Read-only process map for a case: the published process rendered with
 * nodeweave, lit by the case's readiness state. Pan/zoom only — nodes are
 * non-interactive (pointer-events disabled) so it reads as a live map, not an
 * editor. Rebuilds when the selected case changes.
 *
 * Reads the shared ProcessStore directly (a runtime store, like RuntimeService)
 * so the canvas rebuilds reactively when a new process is published.
 */
@Component({
  selector: 'rw-process-map',
  imports: [VisualCanvasComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
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
    rw-process-map { display: block; height: 100%; min-height: 0; }
    .rw-map { position: relative; height: 100%; min-height: 0; }
    .rw-map nodeweave {
      display: block; width: 100%; height: 100%;
      --nw-bg-color: #f3f1f5;
      --nw-bg-pattern: #dcd7e2;
      --nw-node-bg: #ffffff;
      --nw-node-border: #e2dfe7;
      --nw-node-radius: 10px;
      --nw-edge-color: #c4c0cc;
      --nw-port-color: #cfcbd8;
      --nw-port-border-color: #b6b1c2;
    }
    /* Read-only: nodes are non-interactive; the surface still pans/zooms. */
    .rw-map .vc-node { pointer-events: none; box-shadow: var(--shadow-2); }
    .rw-map path.vc-edge.rw-edge-done { stroke: #107c10; stroke-width: 2; }

    .legend {
      position: absolute; left: 12px; bottom: 12px; z-index: 40;
      display: flex; flex-wrap: wrap; gap: 10px;
      background: rgba(255, 255, 255, 0.94); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 7px 11px; font-size: var(--fs-100); font-weight: var(--fw-medium); color: var(--muted);
      box-shadow: var(--shadow-4); backdrop-filter: blur(4px);
    }
    .legend span { display: inline-flex; align-items: center; gap: 5px; }
    .legend .d { width: 8px; height: 8px; border-radius: 2px; }
    .legend .done { background: #107c10; }
    .legend .active { background: #7500c0; }
    .legend .awaiting { background: #bc4b09; }
    .legend .blocked { background: #c50f1f; }
    .legend .pending { background: #9a95a4; }
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
