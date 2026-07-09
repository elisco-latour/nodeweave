import { Directive, ElementRef, effect, inject, input } from '@angular/core';
import { Port } from 'visual-canvas/core';

/**
 * Sets the `nodeId` DOM property on a node host element so the framework
 * agnostic controllers (which read `el.nodeId` off the composed path) can
 * identify it — mirroring the canvas-node custom element's contract.
 */
@Directive({
  selector: '[vcNodeId]',
  standalone: true,
  host: { 'data-vc-node': '' },
})
export class VcNodeIdDirective {
  readonly vcNodeId = input.required<string>();
  readonly #el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    effect(() => {
      (this.#el.nativeElement as unknown as { nodeId: string }).nodeId = this.vcNodeId();
    });
  }
}

/**
 * Sets the `portId` / `direction` / `nodeId` DOM properties on a port element
 * so the DragController, SelectionController and EdgeRoutingController can read
 * them — mirroring the canvas-port custom element's contract.
 */
@Directive({
  selector: '[vcPort]',
  standalone: true,
  host: { 'data-vc-port': '' },
})
export class VcPortDirective {
  readonly vcPort = input.required<Port>();
  readonly #el = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    effect(() => {
      const p = this.vcPort();
      const el = this.#el.nativeElement as unknown as {
        portId: string;
        direction: string;
        nodeId: string;
      };
      el.portId = p.id;
      el.direction = p.direction;
      el.nodeId = p.nodeId;
    });
  }
}
