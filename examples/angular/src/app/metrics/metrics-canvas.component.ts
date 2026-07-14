import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  ElementRef,
  afterNextRender,
  computed,
  signal,
  viewChild,
} from '@angular/core';
import { VisualCanvasComponent, NodeweavePanelComponent } from '@build744/angular';
import {
  NwPaletteComponent,
  NwInspectorComponent,
  nodeFromDrop,
  allowNodeDrop,
} from '@build744/angular-authoring';
import { buildMockup, metricsCatalog } from './metrics-model';

@Component({
  selector: 'app-metrics-canvas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    VisualCanvasComponent,
    NodeweavePanelComponent,
    NwPaletteComponent,
    NwInspectorComponent,
  ],
  template: `
    <div class="mc">
      <nw-palette [catalog]="catalog" (add)="onPaletteAdd($event)"></nw-palette>

      <div class="stage">
        <header class="topbar">
          <span class="crumb">Example: Music subscription service</span>
          <span class="sep">|</span>
          <span class="crumb muted">Canvas</span>
          <span class="spacer"></span>
          <span class="count">{{ cv.service.nodes().length }} nodes</span>
          <span class="count">{{ cv.service.edges().length }} edges</span>
          <label class="toggle" title="Metric cards stay fixed (metadata.resizable=false) regardless">
            <input type="checkbox" [checked]="resizable()" (change)="resizable.set($any($event.target).checked)" />
            Resizable nodes
          </label>
          <button type="button" (click)="cv.service.undo()" [disabled]="!cv.service.canUndo()">Undo</button>
          <button type="button" (click)="cv.service.redo()" [disabled]="!cv.service.canRedo()">Redo</button>
          <button type="button" (click)="reset()">Reset</button>
        </header>

        <div #wrap class="canvas-wrap">
          <nodeweave
            #cv
            background="dots"
            [backgroundGap]="22"
            [nodeTypes]="nodeTypes"
            [nodesResizable]="resizable()"
            (dragover)="onDragOver($event)"
            (drop)="onDrop($event)"
          >
            @if (inspector(); as ins) {
              <nodeweave-panel [x]="ins.x" [y]="ins.y">
                <nw-inspector [node]="ins.node" [schema]="ins.schema" [service]="cv.service"></nw-inspector>
              </nodeweave-panel>
            }

            <nodeweave-panel position="bottom-left">
              <div class="legend">
                <span><i class="dot pos"></i> positive correlation</span>
                <span><i class="dot neg"></i> negative correlation</span>
              </div>
            </nodeweave-panel>
          </nodeweave>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; }

    .mc { display: grid; grid-template-columns: auto 1fr; height: 100%; background: #f1f4f8; }
    .mc .stage { display: grid; grid-template-rows: auto 1fr; min-width: 0; }

    .mc .topbar {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 16px; background: #fff; border-bottom: 1px solid #e5e7eb;
      font-family: system-ui, -apple-system, sans-serif; color: #0f172a; font-size: 0.86rem;
    }
    .mc .topbar .crumb { font-weight: 600; }
    .mc .topbar .muted { color: #94a3b8; font-weight: 500; }
    .mc .topbar .sep { color: #cbd5e1; }
    .mc .topbar .spacer { flex: 1; }
    .mc .topbar .count { font-size: 0.76rem; color: #64748b; }
    .mc .topbar button {
      padding: 5px 12px; border: 1px solid #e5e7eb; background: #f8fafc; color: #0f172a;
      border-radius: 7px; font: inherit; font-size: 0.78rem; cursor: pointer;
    }
    .mc .topbar button:hover:not(:disabled) { background: #eef2ff; border-color: #c7d2fe; }
    .mc .topbar button:disabled { opacity: 0.4; cursor: default; }
    .mc .topbar .toggle { display: flex; align-items: center; gap: 5px; font-size: 0.78rem; color: #475569; cursor: pointer; user-select: none; }
    .mc .topbar .toggle input { width: 14px; height: 14px; cursor: pointer; }

    .mc .canvas-wrap { position: relative; min-width: 0; overflow: hidden; }

    /* Theme the canvas light, to match the mockup. */
    .mc nodeweave {
      display: block; width: 100%; height: 100%;
      --nw-bg-color: #eef1f5;
      --nw-bg-pattern: #cdd5df;
      --nw-node-bg: #ffffff;
      --nw-node-border: #e5e7eb;
      --nw-node-radius: 12px;
      --nw-text-color: #0f172a;
      --nw-selection-border: #6366f1;
      --nw-edge-color: #cbd5e1;
      --nw-edge-color-phantom: #a5b4fc;
      --nw-port-color: #cbd5e1;
      --nw-port-border-color: #94a3b8;
      --nw-port-hover-color: #6366f1;
    }
    .mc .vc-node { box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08); transition: box-shadow 0.15s; }
    .mc .vc-node.vc-selected { box-shadow: 0 8px 24px rgba(99, 102, 241, 0.30); }

    /* Correlation + flow edges (rendered by the library's edge layer). */
    .mc path.vc-edge.corr-pos { stroke: #22c55e; stroke-width: 2.5; stroke-dasharray: 2 5; stroke-linecap: round; }
    .mc path.vc-edge.corr-neg { stroke: #ef4444; stroke-width: 2.5; stroke-dasharray: 2 5; stroke-linecap: round; }
    .mc path.vc-edge.flow-dim { stroke: #cbd5e1; stroke-width: 2; stroke-dasharray: 2 5; stroke-linecap: round; }
    .mc .vc-edge-label-group.corr-pos rect.vc-edge-label-pill { fill: #16a34a; }
    .mc .vc-edge-label-group.corr-neg rect.vc-edge-label-pill { fill: #ef4444; }
    .mc .vc-edge-label-group .vc-edge-label { fill: #ffffff; }

    .mc .legend {
      display: flex; flex-direction: column; gap: 4px;
      background: rgba(255, 255, 255, 0.92); border: 1px solid #e5e7eb; border-radius: 9px;
      padding: 8px 10px; font-family: system-ui, sans-serif; font-size: 0.72rem; color: #475569;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
    }
    .mc .legend span { display: flex; align-items: center; gap: 6px; }
    .mc .legend .dot { width: 16px; height: 0; border-top: 2.5px dotted; border-radius: 2px; }
    .mc .legend .dot.pos { border-color: #22c55e; }
    .mc .legend .dot.neg { border-color: #ef4444; }
  `,
})
export class MetricsCanvasComponent {
  readonly cvRef = viewChild(VisualCanvasComponent);
  readonly wrap = viewChild<ElementRef<HTMLElement>>('wrap');

  /** The node catalog powers the palette, inspector schemas, and node factory. */
  readonly catalog = metricsCatalog;
  readonly nodeTypes = metricsCatalog.nodeTypes();

  /** Canvas-wide resize default. Metric cards opt out via metadata.resizable. */
  readonly resizable = signal(true);

  #addCounter = 0;

  /** The single-selection inspector: node, its schema, and where to anchor it. */
  readonly inspector = computed(() => {
    const cv = this.cvRef();
    if (!cv) return null;
    const selected = cv.service.selectedNodes();
    if (selected.length !== 1) return null;
    const node = selected[0];
    const schema = this.catalog.schemaFor(node.type);
    if (!schema) return null;
    const v = cv.service.viewport();
    return {
      node,
      schema,
      x: (node.x + node.width) * v.zoom + v.panX + 14,
      y: node.y * v.zoom + v.panY,
    };
  });

  constructor() {
    afterNextRender(() => {
      const cv = this.cvRef();
      if (cv) buildMockup(cv.service);
    });
  }

  reset(): void {
    const cv = this.cvRef();
    if (cv) buildMockup(cv.service);
  }

  onDragOver(ev: DragEvent): void {
    allowNodeDrop(ev);
  }

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
    const node = this.catalog.createNode(
      type,
      p.x - (def?.width ?? 200) / 2 + jitter,
      p.y - (def?.height ?? 90) / 2 + jitter,
    );
    cv.service.addNode(node);
    cv.service.selectNode(node.id);
  }
}
