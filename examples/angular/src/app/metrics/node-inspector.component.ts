import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { Node, VisualCanvasService } from '@nodeweave/angular';
import type { SchemaDefinition, SchemaField } from '@nodeweave/angular';
import { RuleEvaluator } from '@nodeweave/core/core';

interface FieldEntry {
  key: string;
  def: SchemaField;
  value: unknown;
  visible: boolean;
}

/**
 * A contextual inspector that renders a config form from a SchemaDefinition and
 * writes edits back through the canvas service. Drop it inside a
 * <nodeweave-panel> to anchor it to the selected node.
 */
@Component({
  selector: 'app-node-inspector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="inspector" (pointerdown)="$event.stopPropagation()">
      <header>
        <span class="type">{{ typeLabel() }}</span>
        <button type="button" class="x" (click)="close()" aria-label="Close inspector">&times;</button>
      </header>

      <div class="body">
        @for (f of entries(); track f.key) {
          @if (f.visible) {
            <label class="field">
              <span class="lbl">{{ f.def.label }}</span>

              @switch (f.def.type) {
                @case ('select') {
                  <select (change)="update(f.key, f.def, $event)">
                    @for (opt of f.def.options ?? []; track opt) {
                      <option [value]="opt" [selected]="opt === f.value">{{ opt }}</option>
                    }
                  </select>
                }
                @case ('boolean') {
                  <input type="checkbox" [checked]="!!f.value" (change)="update(f.key, f.def, $event)" />
                }
                @case ('number') {
                  <input type="number" [value]="f.value ?? ''"
                         [attr.min]="f.def.min" [attr.max]="f.def.max" [attr.step]="f.def.step"
                         (change)="update(f.key, f.def, $event)" />
                }
                @default {
                  <input type="text" [value]="f.value ?? ''" [attr.placeholder]="f.def.placeholder"
                         (change)="update(f.key, f.def, $event)" />
                }
              }
            </label>
          }
        }
      </div>

      <footer>
        <button type="button" class="del" (click)="remove()">Delete node</button>
      </footer>
    </div>
  `,
  styles: `
    .inspector {
      width: 260px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.18);
      font-family: system-ui, -apple-system, sans-serif;
      color: #0f172a;
      overflow: hidden;
    }
    header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 12px; border-bottom: 1px solid #eef2f7; background: #f8fafc;
    }
    header .type { font-size: 0.78rem; font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase; color: #475569; }
    header .x { border: none; background: none; font-size: 1.1rem; line-height: 1; color: #94a3b8; cursor: pointer; padding: 2px 6px; border-radius: 6px; }
    header .x:hover { background: #eef2f7; color: #0f172a; }
    .body { padding: 12px; display: flex; flex-direction: column; gap: 10px; max-height: 340px; overflow-y: auto; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field .lbl { font-size: 0.72rem; font-weight: 600; color: #64748b; }
    .field input[type="text"], .field input[type="number"], .field select {
      width: 100%; box-sizing: border-box; padding: 6px 8px;
      border: 1px solid #e2e8f0; border-radius: 7px; font: inherit; font-size: 0.82rem; background: #fff; color: #0f172a;
    }
    .field input:focus, .field select:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
    .field input[type="checkbox"] { width: 16px; height: 16px; align-self: flex-start; }
    footer { padding: 10px 12px; border-top: 1px solid #eef2f7; }
    footer .del {
      width: 100%; padding: 7px; border: 1px solid #fecaca; background: #fef2f2; color: #dc2626;
      border-radius: 8px; font: inherit; font-size: 0.8rem; font-weight: 600; cursor: pointer;
    }
    footer .del:hover { background: #fee2e2; }
  `,
})
export class NodeInspectorComponent {
  readonly node = input.required<Node>();
  readonly schema = input.required<SchemaDefinition>();
  /** Passed in (rather than injected) because this renders as projected content. */
  readonly svc = input.required<VisualCanvasService>();

  readonly typeLabel = computed(() => this.node().type.replace('metric-', '').replace('-', ' '));

  readonly entries = computed<FieldEntry[]>(() => {
    this.svc().configTick();
    const cfg = (this.node().metadata.config ?? {}) as Record<string, unknown>;
    return Object.entries(this.schema().fields).map(([key, def]) => {
      const value = cfg[key] ?? def.default ?? (def.type === 'boolean' ? false : '');
      const visible = !def.showIf || RuleEvaluator.evaluate(def.showIf, cfg);
      return { key, def, value, visible };
    });
  });

  update(key: string, def: SchemaField, ev: Event): void {
    const el = ev.target as HTMLInputElement | HTMLSelectElement;
    let value: unknown;
    if (def.type === 'boolean') value = (el as HTMLInputElement).checked;
    else if (def.type === 'number') value = el.value === '' ? null : Number(el.value);
    else value = el.value;
    this.svc().updateNodeConfig(this.node().id, { [key]: value });
  }

  close(): void {
    this.svc().clearSelection();
  }

  remove(): void {
    this.svc().removeNode(this.node().id);
    this.svc().clearSelection();
  }
}
