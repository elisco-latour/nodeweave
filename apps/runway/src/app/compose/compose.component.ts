import {
  Component, ChangeDetectionStrategy, ViewEncapsulation, ElementRef,
  computed, effect, inject, signal, viewChild,
} from '@angular/core';
import { VisualCanvasComponent, NodeweavePanelComponent, type VisualCanvasService } from '@nodeweave/angular';
import { NwPaletteComponent, NwInspectorComponent, nodeFromDrop, allowNodeDrop } from '@nodeweave/angular-authoring';
import type { Pathway } from '../domain/model';
import { ProcessStore } from '../runtime/process-store';
import { processCatalog, buildTemplate } from './process-catalog';

/**
 * Compose — the Process Studio. Author/evolve the onboarding process for a
 * pathway on the visual canvas (palette + schema inspector). Standalone
 * authoring surface for now; publishing versions + wiring to Operate comes
 * with persistence (Phase 3).
 */
@Component({
  selector: 'rw-compose',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [VisualCanvasComponent, NodeweavePanelComponent, NwPaletteComponent, NwInspectorComponent],
  template: `
    <div class="rw-compose">
      <div class="cbar">
        <div class="seg">
          <button type="button" [class.on]="pathway() === 'centre-level'" (click)="pathway.set('centre-level')">Centre-level</button>
          <button type="button" [class.on]="pathway() === 'project-level'" (click)="pathway.set('project-level')">Project-level</button>
        </div>
        <span class="ver">{{ processName() }} · {{ versionLabel() }}</span>
        <span class="grow"></span>
        <span class="count">{{ cv.service.nodes().length }} steps</span>
        <span class="count">{{ cv.service.edges().length }} links</span>
        <button type="button" (click)="reset()">Reset</button>
        <button type="button" class="primary" (click)="publish(cv.service)">{{ justPublished() ? 'Published ✓' : 'Publish' }}</button>
      </div>

      <div class="body">
        <nw-palette [catalog]="catalog" heading="Steps" (add)="onPaletteAdd($event)"></nw-palette>
        <div #wrap class="canvas">
          <nodeweave #cv background="dots" [backgroundGap]="22" [nodeTypes]="nodeTypes" [nodesResizable]="false"
                     (dragover)="onDragOver($event)" (drop)="onDrop($event)">
            @if (inspector(); as ins) {
              <nodeweave-panel [x]="ins.x" [y]="ins.y">
                <nw-inspector [node]="ins.node" [schema]="ins.schema" [service]="cv.service"></nw-inspector>
              </nodeweave-panel>
            }
          </nodeweave>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; min-height: 0; }
    .rw-compose { display: flex; flex-direction: column; height: 100%; min-height: 0; }

    .cbar { flex: none; display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: var(--surface); border-bottom: 1px solid var(--border); font-size: 0.84rem; }
    .seg { display: inline-flex; background: var(--surface-2); border: 1px solid var(--border); border-radius: 999px; padding: 2px; }
    .seg button { border: none; background: transparent; font: inherit; font-size: 0.8rem; color: var(--muted); padding: 5px 14px; border-radius: 999px; cursor: pointer; }
    .seg button.on { background: var(--accent); color: #fff; font-weight: 600; }
    .ver { font-size: 0.76rem; color: var(--faint); font-family: ui-monospace, Menlo, monospace; }
    .grow { flex: 1; }
    .count { font-size: 0.76rem; color: var(--muted); }
    .cbar button { padding: 6px 12px; border: 1px solid var(--border); background: var(--surface); color: var(--text); border-radius: 8px; font: inherit; font-size: 0.78rem; cursor: pointer; }
    .cbar button:hover:not(:disabled) { background: var(--surface-2); }
    .cbar .primary { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
    .cbar .primary:hover:not(:disabled) { background: #4338ca; }

    .body { flex: 1; min-height: 0; display: grid; grid-template-columns: 248px 1fr; }
    .canvas { position: relative; min-width: 0; overflow: hidden; }

    .rw-compose nodeweave {
      display: block; width: 100%; height: 100%;
      --nw-bg-color: #f6f7f9;
      --nw-bg-pattern: #dfe3e9;
      --nw-node-bg: #ffffff;
      --nw-node-border: #e6e8ec;
      --nw-node-radius: 11px;
      --nw-selection-border: #4f46e5;
      --nw-edge-color: #b6bcc6;
      --nw-edge-color-phantom: #a5b4fc;
      --nw-port-color: #cbd5e1;
      --nw-port-border-color: #b6bcc6;
      --nw-port-hover-color: #4f46e5;
      --nw-port-label-color: #98a2b3;
    }
    .rw-compose .vc-node { box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08); }
    .rw-compose .vc-node.vc-selected { box-shadow: 0 6px 18px rgba(79, 70, 229, 0.26); }
  `,
})
export class ComposeComponent {
  readonly cvRef = viewChild(VisualCanvasComponent);
  readonly wrap = viewChild<ElementRef<HTMLElement>>('wrap');

  readonly #store = inject(ProcessStore);
  readonly pathway = signal<Pathway>('centre-level');
  readonly catalog = processCatalog;
  readonly nodeTypes = processCatalog.nodeTypes();
  readonly justPublished = signal(false);
  #addCounter = 0;

  readonly processName = computed(() => (this.pathway() === 'centre-level' ? 'centre-onboarding' : 'project-onboarding'));
  readonly versionLabel = computed(() => {
    const p = this.#store.published(this.pathway());
    return p ? `v${p.version} · published` : 'draft';
  });

  readonly inspector = computed(() => {
    const cv = this.cvRef();
    if (!cv) return null;
    const selected = cv.service.selectedNodes();
    if (selected.length !== 1) return null;
    const node = selected[0];
    const schema = this.catalog.schemaFor(node.type);
    if (!schema) return null;
    const v = cv.service.viewport();
    return { node, schema, x: (node.x + node.width) * v.zoom + v.panX + 14, y: node.y * v.zoom + v.panY };
  });

  constructor() {
    // Seed / re-seed the template when the canvas is ready or the pathway changes.
    effect(() => {
      const cv = this.cvRef();
      const p = this.pathway();
      if (cv) buildTemplate(cv.service, p);
    });
  }

  reset(): void {
    const cv = this.cvRef();
    if (cv) buildTemplate(cv.service, this.pathway());
  }

  publish(service: VisualCanvasService): void {
    this.#store.publish(this.pathway(), service.toJSON());
    this.justPublished.set(true);
    setTimeout(() => this.justPublished.set(false), 2200);
  }

  onDragOver(ev: DragEvent): void { allowNodeDrop(ev); }
  onDrop(ev: DragEvent): void {
    const cv = this.cvRef();
    if (cv) nodeFromDrop(this.catalog, cv.service, ev);
  }

  onPaletteAdd(type: string): void {
    const cv = this.cvRef();
    if (!cv) return;
    const def = this.catalog.get(type);
    const rect = this.wrap()?.nativeElement.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : 480;
    const cy = rect ? rect.top + rect.height / 2 : 320;
    const p = cv.service.screenToFlowPosition({ x: cx, y: cy });
    const jitter = (this.#addCounter++ % 5) * 26;
    const node = this.catalog.createNode(type, p.x - (def?.width ?? 212) / 2 + jitter, p.y - (def?.height ?? 78) / 2 + jitter);
    cv.service.addNode(node);
    cv.service.selectNode(node.id);
  }
}
