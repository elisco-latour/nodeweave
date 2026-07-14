import {
  Component,
  ChangeDetectionStrategy,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  DestroyRef,
  Type,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { CanvasState, Node } from '@build744/core/core';
import type { ControllerOptions } from '@build744/core/controllers';
import {
  DragController,
  PanZoomController,
  SelectionController,
  EdgeRoutingController,
  KeyboardController,
  ResizeController,
} from '@build744/core/controllers';
import { VisualCanvasService } from './visual-canvas.service';
import { VcEdgeLayerComponent } from './vc-edge-layer.component';
import { VcNodeIdDirective, VcPortDirective } from './dom-bindings';
import { portViews, type PortView } from './node-layout';

// Registers the <canvas-background> / <canvas-controls> custom elements.
import '@build744/core';

export type BackgroundVariant = 'dots' | 'lines' | 'cross';

interface StatefulElement extends HTMLElement { state: CanvasState | null; }
interface ControlsElement extends StatefulElement { workspace: HTMLElement | null; }
interface BackgroundElement extends StatefulElement { type: BackgroundVariant; gap: number; }
interface Detachable { attach(): void; detach(): void; }

/**
 * <nodeweave> — Angular host that renders the graph with Angular.
 *
 * Nodes are rendered by Angular: pass `nodeTypes` to map a node's `type` to a
 * standalone component (which receives the node via a `node` input); otherwise
 * a default node is drawn. Edges, ports, background and controls are rendered
 * around them, and the framework-agnostic controllers (drag/pan/zoom/select/
 * connect/resize) are attached to the untransformed surface.
 *
 * Read and mutate the graph through the injected VisualCanvasService (exposed
 * as `.service`).
 */
@Component({
  selector: 'nodeweave',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [VisualCanvasService],
  imports: [NgComponentOutlet, VcEdgeLayerComponent, VcNodeIdDirective, VcPortDirective],
  template: `
    <canvas-background #bg></canvas-background>

    <div class="vc-surface" #surface>
      <div class="vc-viewport" [style.transform]="viewportTransform()">
        <vc-edge-layer></vc-edge-layer>

        @for (node of service.nodes(); track node.id) {
          <div
            class="vc-node"
            [vcNodeId]="node.id"
            [class.vc-selected]="service.selectedIds().has(node.id)"
            [style.transform]="'translate(' + node.x + 'px, ' + node.y + 'px)'"
            [style.width.px]="node.width"
            [style.height.px]="node.height"
          >
            <div class="vc-node-content">
              @if (componentFor(node.type); as comp) {
                <ng-container [ngComponentOutlet]="comp" [ngComponentOutletInputs]="{ node: node }"></ng-container>
              } @else {
                <div class="vc-default-node">
                  <span class="vc-default-header"></span>
                  <span class="vc-default-label">{{ node.type }}</span>
                </div>
              }
            </div>

            @for (pv of ports(node); track pv.port.id) {
              <span
                class="vc-port"
                [class.vc-port-in]="pv.port.direction === 'in'"
                [vcPort]="pv.port"
                [style.left.px]="pv.x"
                [style.top.px]="pv.y"
              ></span>
              @if (pv.port.label) {
                <span
                  class="vc-port-label"
                  [class.vc-port-label-in]="pv.port.direction === 'in'"
                  [style.left.px]="pv.x"
                  [style.top.px]="pv.y"
                >{{ pv.port.label }}</span>
              }
            }
          </div>
        }
      </div>
    </div>

    @if (showControls()) {
      <canvas-controls></canvas-controls>
    }

    <!-- Overlay slot: project <nodeweave-panel>, palettes, toolbars, inspectors. -->
    <ng-content></ng-content>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    .vc-surface, .vc-viewport {
      position: absolute;
      inset: 0;
    }
    .vc-viewport {
      transform-origin: 0 0;
    }
    canvas-controls {
      position: absolute;
      bottom: 16px;
      right: 16px;
      z-index: 50;
    }
    .vc-node {
      position: absolute;
      top: 0;
      left: 0;
      box-sizing: border-box;
      background: var(--nw-node-bg, #16213e);
      border: 1px solid var(--nw-node-border, #2a3a5e);
      border-radius: var(--nw-node-radius, 8px);
      color: var(--nw-text-color, #e2e8f0);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.875rem;
      user-select: none;
    }
    .vc-node.vc-selected {
      outline: 2px solid var(--nw-selection-border, #4dabf7);
      outline-offset: 1px;
    }
    .vc-node-content {
      width: 100%;
      height: 100%;
      overflow: hidden;
      border-radius: inherit;
    }
    .vc-default-node {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .vc-default-header {
      height: 6px;
      background: var(--nw-node-accent, #4dabf7);
      border-radius: inherit inherit 0 0;
    }
    .vc-default-label {
      padding: 8px 12px;
      font-weight: 500;
    }
    .vc-port {
      position: absolute;
      width: 11px;
      height: 11px;
      border-radius: 50%;
      background: var(--nw-port-color, #64748b);
      border: 2px solid var(--nw-port-border-color, #94a3b8);
      box-sizing: border-box;
      transform: translate(-50%, -50%);
      cursor: crosshair;
    }
    .vc-port[data-valid-target] {
      background: var(--nw-port-hover-color, #4dabf7);
    }
    .vc-port-label {
      position: absolute;
      transform: translate(9px, -50%);
      font-size: 9px;
      line-height: 1;
      color: var(--nw-port-label-color, #94a3b8);
      white-space: nowrap;
      pointer-events: none;
      user-select: none;
    }
    .vc-port-label.vc-port-label-in {
      transform: translate(calc(-100% - 9px), -50%);
    }
  `,
})
export class VisualCanvasComponent {
  /** The signal-first state service for this canvas instance. */
  readonly service = inject(VisualCanvasService);
  readonly #hostRef = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Map a node `type` to a standalone component that receives a `node` input. */
  readonly nodeTypes = input<Record<string, Type<unknown>>>({});
  readonly background = input<BackgroundVariant>('dots');
  readonly backgroundGap = input(20);
  readonly showControls = input(true);
  readonly snapToGrid = input(false);
  /**
   * Whether nodes show resize handles when selected. Global default; a node can
   * opt out (or in) individually with `metadata.resizable` (true/false).
   */
  readonly nodesResizable = input(true);

  /** Emitted when an edge connection is made by dragging between ports. */
  readonly connect = output<{ source: string; target: string }>();

  readonly viewportTransform = computed(() => {
    const v = this.service.viewport();
    return `translate(${v.panX}px, ${v.panY}px) scale(${v.zoom})`;
  });

  #controllers: Detachable[] = [];
  #resize: ResizeController | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.#teardown());

    effect(() => {
      const el = this.#hostRef.nativeElement.querySelector('canvas-background') as BackgroundElement | null;
      if (el) {
        el.type = this.background();
        el.gap = this.backgroundGap();
      }
    });

    // Re-evaluate resize handles when the global flag flips (a selected node's
    // handles should appear/disappear immediately, without another interaction).
    effect(() => {
      this.nodesResizable();
      this.#resize?.refresh();
    });

    afterNextRender(() => this.#setup());
  }

  componentFor(type: string): Type<unknown> | null {
    return this.nodeTypes()[type] ?? null;
  }

  ports(node: Node): PortView[] {
    return portViews(node);
  }

  #setup(): void {
    const state = this.service.state;
    const host = this.#hostRef.nativeElement;
    const surface = host.querySelector('.vc-surface') as HTMLElement;
    this.service.registerSurface(surface);

    const bg = host.querySelector('canvas-background') as BackgroundElement | null;
    if (bg) bg.state = state;

    const controls = host.querySelector('canvas-controls') as ControlsElement | null;
    if (controls) {
      controls.state = state;
      controls.workspace = surface;
    }

    const edgeLayer = host.querySelector('vc-edge-layer') as HTMLElement | null;

    const options: ControllerOptions = {
      nodeSelector: '[data-vc-node]',
      portSelector: '[data-vc-port]',
      snapGrid: this.snapToGrid() ? [20, 20] : undefined,
      onConnect: (source, target) => this.connect.emit({ source, target }),
      // Per-node `metadata.resizable` wins; otherwise fall back to the global input.
      isResizable: (node: Node) =>
        (node.metadata['resizable'] as boolean | undefined) ?? this.nodesResizable(),
    };

    const resize = new ResizeController(surface, state, options);
    this.#resize = resize;
    this.#controllers = [
      new DragController(surface, state, options),
      new PanZoomController(surface, state),
      new SelectionController(surface, state, options),
      new KeyboardController(surface, state, options),
      resize,
    ];
    if (edgeLayer) {
      this.#controllers.push(new EdgeRoutingController(surface, state, edgeLayer, options));
    }
    for (const c of this.#controllers) c.attach();
  }

  #teardown(): void {
    for (const c of this.#controllers) c.detach();
    this.#controllers = [];
    this.#resize = null;
  }
}
