import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';

export type PanelPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

interface Placement {
  left: string | null;
  right: string | null;
  top: string | null;
  bottom: string | null;
  transform: string | null;
}

/**
 * <nodeweave-panel> — a positioned overlay slot for content that floats over
 * the canvas (toolbars, palettes, legends, a contextual inspector).
 *
 * Project it into <nodeweave>. Use `position` for a fixed corner/edge, or set
 * `x`/`y` (pixels, relative to the canvas surface) to anchor it freely — e.g.
 * next to a selected node via `service.flowToScreenPosition(...)`.
 *
 * Purely structural: it does positioning and nothing else. Style the projected
 * content however you like.
 */
@Component({
  selector: 'nodeweave-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content></ng-content>`,
  host: {
    class: 'nodeweave-panel',
    '[style.left]': 'placement().left',
    '[style.right]': 'placement().right',
    '[style.top]': 'placement().top',
    '[style.bottom]': 'placement().bottom',
    '[style.transform]': 'placement().transform',
  },
  styles: `
    :host {
      position: absolute;
      z-index: 60;
      pointer-events: auto;
      box-sizing: border-box;
    }
  `,
})
export class NodeweavePanelComponent {
  /** Corner/edge preset, used when `x`/`y` are not set. */
  readonly position = input<PanelPosition>('top-left');
  /** Explicit horizontal offset (px from the surface's left edge). Overrides `position`. */
  readonly x = input<number | null>(null);
  /** Explicit vertical offset (px from the surface's top edge). Overrides `position`. */
  readonly y = input<number | null>(null);
  /** Gap from the canvas edge for presets (px). */
  readonly offset = input(12);

  readonly placement = computed<Placement>(() => {
    const x = this.x();
    const y = this.y();
    const base: Placement = { left: null, right: null, top: null, bottom: null, transform: null };

    if (x != null && y != null) {
      return { ...base, left: `${x}px`, top: `${y}px` };
    }

    const gap = `${this.offset()}px`;
    const [v, h] = this.position().split('-');

    if (v === 'top') base.top = gap;
    else if (v === 'bottom') base.bottom = gap;
    else base.top = '50%';

    if (h === 'left') base.left = gap;
    else if (h === 'right') base.right = gap;
    else base.left = '50%';

    const tx = h === 'center' ? '-50%' : '0';
    const ty = v === 'center' ? '-50%' : '0';
    if (tx !== '0' || ty !== '0') base.transform = `translate(${tx}, ${ty})`;

    return base;
  });
}
