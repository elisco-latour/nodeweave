import {
  Component,
  ChangeDetectionStrategy,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  DestroyRef,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { CanvasState } from 'visual-canvas/core';
import type { ControllerOptions } from 'visual-canvas/controllers';
import {
  DragController,
  PanZoomController,
  SelectionController,
  EdgeRoutingController,
  KeyboardController,
  ResizeController,
} from 'visual-canvas/controllers';
import { VisualCanvasService } from './visual-canvas.service';

// Registers the <canvas-*> custom elements as a side effect.
import 'visual-canvas';

export type BackgroundVariant = 'dots' | 'lines' | 'cross';

interface StatefulElement extends HTMLElement {
  state: CanvasState | null;
}
interface ControlsElement extends StatefulElement {
  workspace: HTMLElement | null;
}
interface BackgroundElement extends StatefulElement {
  type: BackgroundVariant;
  gap: number;
}

interface Detachable {
  attach(): void;
  detach(): void;
}

/**
 * <visual-canvas> — Angular host for the visual-canvas engine.
 *
 * Drives the framework-agnostic CanvasState (via VisualCanvasService) and the
 * lib's Web Components + interaction controllers. Read/mutate the graph through
 * the injected VisualCanvasService (exposed here as `.service`).
 */
@Component({
  selector: 'visual-canvas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [VisualCanvasService],
  template: `
    <canvas-background #bg></canvas-background>
    <canvas-workspace #ws tabindex="0"></canvas-workspace>
    @if (showControls()) {
      <canvas-controls #controls></canvas-controls>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    canvas-workspace {
      position: relative;
      z-index: 1;
      display: block;
      width: 100%;
      height: 100%;
    }
    canvas-controls {
      position: absolute;
      bottom: 16px;
      right: 16px;
      z-index: 50;
    }
  `,
})
export class VisualCanvasComponent {
  /** The signal-first state service for this canvas instance. */
  readonly service = inject(VisualCanvasService);

  readonly background = input<BackgroundVariant>('dots');
  readonly backgroundGap = input(20);
  readonly showControls = input(true);
  readonly snapToGrid = input(false);

  /** Emitted when an edge connection is made by dragging between ports. */
  readonly connect = output<{ source: string; target: string }>();

  private readonly ws = viewChild.required<ElementRef<HTMLElement>>('ws');
  private readonly bg = viewChild<ElementRef<HTMLElement>>('bg');
  private readonly controlsRef = viewChild<ElementRef<HTMLElement>>('controls');

  #controllers: Detachable[] = [];

  constructor() {
    inject(DestroyRef).onDestroy(() => this.#teardown());

    // Keep the background element in sync with the inputs (runs after render).
    effect(() => {
      const el = this.bg()?.nativeElement as BackgroundElement | undefined;
      if (el) {
        el.type = this.background();
        el.gap = this.backgroundGap();
      }
    });

    afterNextRender(() => this.#setup());
  }

  #setup(): void {
    const state = this.service.state;

    const wsEl = this.ws().nativeElement as StatefulElement;
    wsEl.state = state; // creates the internal edge layer

    const bgEl = this.bg()?.nativeElement as BackgroundElement | undefined;
    if (bgEl) bgEl.state = state;

    const controlsEl = this.controlsRef()?.nativeElement as ControlsElement | undefined;
    if (controlsEl) {
      controlsEl.state = state;
      controlsEl.workspace = wsEl;
    }

    const edgeLayer = wsEl.shadowRoot?.querySelector('canvas-edge-layer') as HTMLElement | null;

    const options: ControllerOptions = {
      nodeSelector: 'canvas-node',
      portSelector: 'canvas-port',
      snapGrid: this.snapToGrid() ? [20, 20] : undefined,
      onConnect: (source, target) => this.connect.emit({ source, target }),
    };

    this.#controllers = [
      new DragController(wsEl, state, options),
      new PanZoomController(wsEl, state),
      new SelectionController(wsEl, state, options),
      new KeyboardController(wsEl, state, options),
      new ResizeController(wsEl, state, options),
    ];
    if (edgeLayer) {
      this.#controllers.push(new EdgeRoutingController(wsEl, state, edgeLayer, options));
    }
    for (const c of this.#controllers) c.attach();
  }

  #teardown(): void {
    for (const c of this.#controllers) c.detach();
    this.#controllers = [];
  }
}
