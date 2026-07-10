import { Component, ChangeDetectionStrategy, computed, output } from '@angular/core';
import { PALETTE, type MetricNodeType, type PaletteItem } from './metrics-model';

/** MIME type carried by a palette drag so the canvas knows what to create. */
export const DND_TYPE = 'application/x-nodeweave-type';

/** The node palette: drag an item onto the canvas, or click to drop it centre-screen. */
@Component({
  selector: 'app-node-palette',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="palette">
      <div class="hd">
        <strong>Palette</strong>
        <span class="tip">drag onto canvas</span>
      </div>

      @for (grp of groups(); track grp.name) {
        <div class="group">
          <div class="group-name">{{ grp.name }}</div>
          @for (item of grp.items; track item.type) {
            <button
              type="button"
              class="item"
              draggable="true"
              (dragstart)="onDragStart($event, item)"
              (click)="add.emit(item.type)"
            >
              <span class="icon" [class]="item.type">{{ item.icon }}</span>
              <span class="text">
                <span class="label">{{ item.label }}</span>
                <span class="hint">{{ item.hint }}</span>
              </span>
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .palette {
      height: 100%; box-sizing: border-box; width: 248px;
      background: #ffffff; border-right: 1px solid #e5e7eb;
      padding: 14px; overflow-y: auto;
      font-family: system-ui, -apple-system, sans-serif; color: #0f172a;
    }
    .hd { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; }
    .hd strong { font-size: 0.9rem; }
    .hd .tip { font-size: 0.68rem; color: #94a3b8; }
    .group { margin-bottom: 14px; }
    .group-name { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; margin: 0 0 6px 2px; }
    .item {
      display: flex; align-items: center; gap: 10px; width: 100%; text-align: left;
      padding: 9px 10px; margin-bottom: 6px; cursor: grab;
      background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 9px;
      font: inherit; color: inherit;
    }
    .item:hover { background: #eef2ff; border-color: #c7d2fe; }
    .item:active { cursor: grabbing; }
    .icon {
      flex: none; width: 30px; height: 30px; display: grid; place-items: center;
      border-radius: 8px; font-size: 1rem; color: #fff;
    }
    .icon.project { background: #0ea5e9; }
    .icon.metric-input { background: #6366f1; }
    .icon.metric-northstar { background: #f59e0b; }
    .icon.metric-kpi { background: #8b5cf6; }
    .text { display: flex; flex-direction: column; min-width: 0; }
    .label { font-size: 0.82rem; font-weight: 600; }
    .hint { font-size: 0.68rem; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  `,
})
export class NodePaletteComponent {
  readonly add = output<MetricNodeType>();

  readonly groups = computed(() => {
    const names = [...new Set(PALETTE.map((p) => p.group))];
    return names.map((name) => ({ name, items: PALETTE.filter((p) => p.group === name) }));
  });

  onDragStart(ev: DragEvent, item: PaletteItem): void {
    ev.dataTransfer?.setData(DND_TYPE, item.type);
    ev.dataTransfer?.setData('text/plain', item.label);
    if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'copy';
  }
}
