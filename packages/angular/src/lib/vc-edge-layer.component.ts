import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  ElementRef,
  afterNextRender,
  computed,
  inject,
} from '@angular/core';
import { buildEdgePath, getEdgeCenter } from '@build744/nodeweave-core/core';
import { VisualCanvasService } from './visual-canvas.service';
import { portCanvas } from './node-layout';

interface EdgeView {
  id: string;
  d: string;
  markerEnd: string | null;
  animated: boolean;
  className: string | null;
  label?: string;
  labelX: number;
  labelY: number;
  labelW: number;
}

/**
 * <vc-edge-layer> — Angular SVG layer that draws edges between the rendered
 * node ports. Recomputes reactively from the service's node/edge signals.
 *
 * Exposes `_getPortPosition` on its host element and contains a plain <svg>
 * so the EdgeRoutingController can query it and append its phantom path,
 * exactly like the canvas-edge-layer custom element.
 */
@Component({
  selector: 'vc-edge-layer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <svg class="vc-edge-svg" aria-hidden="true">
      <defs>
        <marker id="vc-a-arrowclosed" viewBox="0 0 10 10" refX="9" refY="5"
                markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
        </marker>
        <marker id="vc-a-arrow" viewBox="0 0 10 10" refX="9" refY="5"
                markerWidth="7" markerHeight="7" orient="auto">
          <path d="M 1 1 L 9 5 L 1 9" fill="none" stroke="context-stroke" stroke-width="1.6" />
        </marker>
      </defs>
      @for (e of edgeViews(); track e.id) {
        <path class="vc-edge" [class.animated]="e.animated" [class]="e.className"
              [attr.d]="e.d" [attr.marker-end]="e.markerEnd"></path>
        @if (e.label) {
          <g class="vc-edge-label-group" [class]="e.className">
            <rect class="vc-edge-label-pill"
                  [attr.x]="e.labelX - e.labelW / 2" [attr.y]="e.labelY - 9"
                  [attr.width]="e.labelW" height="18" rx="9" ry="9"></rect>
            <text class="vc-edge-label" [attr.x]="e.labelX" [attr.y]="e.labelY"
                  text-anchor="middle" dominant-baseline="central">{{ e.label }}</text>
          </g>
        }
      }
    </svg>
  `,
  styles: `
    vc-edge-layer {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    vc-edge-layer .vc-edge-svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    vc-edge-layer path.vc-edge {
      fill: none;
      stroke: var(--nw-edge-color, #64748b);
      stroke-width: 2;
    }
    @keyframes vc-ng-edge-flow { to { stroke-dashoffset: -10; } }
    vc-edge-layer path.vc-edge.animated {
      stroke-dasharray: 6 4;
      animation: vc-ng-edge-flow 0.5s linear infinite;
    }
    @media (prefers-reduced-motion: reduce) {
      vc-edge-layer path.vc-edge.animated { animation: none; }
    }
    vc-edge-layer path.phantom {
      fill: none;
      stroke: var(--nw-edge-color-phantom, #94a3b8);
      stroke-width: 2;
      stroke-dasharray: 6 4;
    }
    vc-edge-layer rect.vc-edge-label-pill {
      fill: var(--nw-edge-label-bg, #334155);
      stroke: var(--nw-edge-label-border, transparent);
      stroke-width: 1;
    }
    vc-edge-layer text.vc-edge-label {
      fill: var(--nw-edge-label-color, #e2e8f0);
      font-size: 11px;
      font-weight: 600;
      font-family: system-ui, sans-serif;
    }
  `,
})
export class VcEdgeLayerComponent {
  readonly service = inject(VisualCanvasService);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly edgeViews = computed<EdgeView[]>(() => {
    // Depend on node geometry as well as the edge set so paths follow moves.
    this.service.nodes();
    const state = this.service.state;
    const views: EdgeView[] = [];
    for (const edge of this.service.edges()) {
      const s = portCanvas(state, edge.sourcePortId);
      const t = portCanvas(state, edge.targetPortId);
      if (!s || !t) continue;
      const center = getEdgeCenter(s, t);
      const cls = edge.data?.['className'];
      views.push({
        id: edge.id,
        d: buildEdgePath(edge.type ?? 'bezier', s, t),
        markerEnd: edge.markerEnd ? `url(#vc-a-${edge.markerEnd})` : null,
        animated: edge.animated,
        className: typeof cls === 'string' ? cls : null,
        label: edge.label,
        labelX: center.x,
        labelY: center.y,
        labelW: edge.label ? edge.label.length * 7 + 14 : 0,
      });
    }
    return views;
  });

  constructor() {
    afterNextRender(() => {
      // Satisfy the EdgeRoutingController's EdgeLayerElement contract.
      (this.#host.nativeElement as unknown as {
        _getPortPosition: (portId: string) => { x: number; y: number } | null;
      })._getPortPosition = (portId: string) => portCanvas(this.service.state, portId);
    });
  }
}
