import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';
import { NodeCatalog, NodeTypeDefinition } from './node-catalog';
import { NW_DND_TYPE } from './dnd';

/**
 * <nw-palette> — a catalog-driven node palette. Drag an item onto the canvas
 * (sets the {@link NW_DND_TYPE} drag payload) or click it to emit `add`.
 * Grouped by the catalog's categories. Styling is themeable via `--nw-pal-*`
 * custom properties.
 */
@Component({
  selector: 'nw-palette',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="nw-palette">
      <div class="hd">
        <strong>{{ heading() }}</strong>
        <span class="tip">drag onto canvas</span>
      </div>

      @for (grp of groups(); track grp.category) {
        <div class="group">
          <div class="group-name">{{ grp.category }}</div>
          @for (item of grp.items; track item.type) {
            <button
              type="button"
              class="item"
              draggable="true"
              (dragstart)="onDragStart($event, item)"
              (click)="add.emit(item.type)"
            >
              <span class="icon" [style.background]="item.color || null">{{ item.icon || '▪' }}</span>
              <span class="text">
                <span class="label">{{ item.label }}</span>
                @if (item.hint) { <span class="hint">{{ item.hint }}</span> }
              </span>
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .nw-palette {
      height: 100%; box-sizing: border-box;
      width: var(--nw-pal-width, 248px);
      background: var(--nw-pal-bg, #ffffff);
      border-right: 1px solid var(--nw-pal-border, #e5e7eb);
      padding: 14px; overflow-y: auto;
      font-family: system-ui, -apple-system, sans-serif; color: var(--nw-pal-text, #0f172a);
    }
    .hd { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; }
    .hd strong { font-size: 0.9rem; }
    .hd .tip { font-size: 0.68rem; color: #94a3b8; }
    .group { margin-bottom: 14px; }
    .group-name { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; margin: 0 0 6px 2px; }
    .item {
      display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
      padding: 9px 10px; margin-bottom: 6px; cursor: grab;
      background: var(--nw-pal-item-bg, #f8fafc); border: 1px solid var(--nw-pal-border, #e5e7eb);
      border-radius: 9px; font: inherit; color: inherit;
    }
    .item:hover { background: var(--nw-pal-item-hover, #eef2ff); border-color: #c7d2fe; }
    .item:active { cursor: grabbing; }
    .icon {
      flex: none; width: 30px; height: 30px; display: grid; place-items: center;
      border-radius: 8px; font-size: 1rem; color: #fff; background: #64748b;
    }
    .text { display: flex; flex-direction: column; min-width: 0; }
    .label { font-size: 0.82rem; font-weight: 600; }
    .hint { font-size: 0.68rem; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  `,
})
export class NwPaletteComponent {
  readonly catalog = input.required<NodeCatalog>();
  readonly heading = input('Palette');

  /** Emits the node type when an item is clicked (click-to-add). */
  readonly add = output<string>();

  readonly groups = computed(() => this.catalog().byCategory());

  onDragStart(ev: DragEvent, item: NodeTypeDefinition): void {
    ev.dataTransfer?.setData(NW_DND_TYPE, item.type);
    ev.dataTransfer?.setData('text/plain', item.label);
    if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'copy';
  }
}
