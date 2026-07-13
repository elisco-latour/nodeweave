import {
  Component, ChangeDetectionStrategy, ViewEncapsulation, ElementRef,
  computed, effect, inject, signal, viewChild,
} from '@angular/core';
import { VisualCanvasComponent, NodeweavePanelComponent, type VisualCanvasService } from '@nodeweave/angular';
import { NwInspectorComponent, nodeFromDrop, allowNodeDrop, NW_DND_TYPE, type NodeTypeDefinition } from '@nodeweave/angular-authoring';
import { ComposeViewModel } from '../../state/compose.view-model';
import { processCatalog, buildTemplate } from '../process-catalog';
import { IconComponent } from '../../../../shared/icon.component';
import { stepIcon, stepColor } from '../step-visuals';

/**
 * Compose — the Process Studio. Author/evolve the onboarding process for a
 * pathway on the visual canvas (Fluent palette + schema inspector) and publish
 * a versioned process via the ViewModel that Operate reads.
 *
 * Smart page: the ComposeViewModel owns the pathway + publish contract; the
 * canvas concerns (catalog, template seeding, drag/drop, inspector) stay here.
 */
@Component({
  selector: 'rw-compose',
  imports: [VisualCanvasComponent, NodeweavePanelComponent, NwInspectorComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [ComposeViewModel],
  template: `
    <div class="rw-compose">
      <div class="cbar">
        <div class="seg">
          <button type="button" [class.on]="vm.pathway() === 'centre-level'" (click)="vm.setPathway('centre-level')">Centre-level</button>
          <button type="button" [class.on]="vm.pathway() === 'project-level'" (click)="vm.setPathway('project-level')">Project-level</button>
        </div>
        <span class="ver">{{ vm.processName() }}</span>
        <span class="verchip" [class.pub]="vm.isPublished()">{{ vm.versionLabel() }}</span>
        <span class="grow"></span>
        <span class="count"><rw-icon name="compose" [size]="15" />{{ cv.service.nodes().length }} steps</span>
        <span class="count"><rw-icon name="branch" [size]="15" />{{ cv.service.edges().length }} links</span>
        <button type="button" class="btn ghost" (click)="reset()"><rw-icon name="reset" [size]="16" />Reset</button>
        <button type="button" class="btn primary" (click)="publish(cv.service)">
          <rw-icon [name]="justPublished() ? 'check' : 'flag'" [size]="16" />{{ justPublished() ? 'Published' : 'Publish' }}
        </button>
      </div>

      <div class="body">
        <aside class="palette">
          <div class="pal-head"><span class="pal-title">Steps</span><span class="pal-tip">drag onto canvas</span></div>
          @for (grp of paletteGroups; track grp.category) {
            <div class="pal-group">
              <div class="pal-cat">{{ grp.category }}</div>
              @for (item of grp.items; track item.type) {
                <button type="button" class="pal-item" draggable="true"
                        (dragstart)="onDragStart($event, item)" (click)="onPaletteAdd(item.type)">
                  <span class="pal-ico" [style.background]="stepColor(item.type)"><rw-icon [name]="stepIcon(item.type)" [size]="15" /></span>
                  <span class="pal-text">
                    <span class="pal-label">{{ item.label }}</span>
                    @if (item.hint) { <span class="pal-hint">{{ item.hint }}</span> }
                  </span>
                </button>
              }
            </div>
          }
        </aside>

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

    /* ── Command bar ─────────────────────────────────────────────────────── */
    .cbar { flex: none; display: flex; align-items: center; gap: var(--s-12); padding: var(--s-10) var(--s-16); background: var(--surface); border-bottom: 1px solid var(--border); font-size: var(--fs-300); }
    .seg { display: inline-flex; background: var(--surface-3); border: 1px solid var(--border); border-radius: var(--radius-pill); padding: 2px; }
    .seg button { border: none; background: transparent; font: inherit; font-size: var(--fs-200); font-weight: var(--fw-semibold); color: var(--muted); padding: 5px 14px; border-radius: var(--radius-pill); cursor: pointer; transition: background 0.1s ease, color 0.1s ease; }
    .seg button.on { background: var(--brand); color: #fff; }
    .ver { font-weight: var(--fw-semibold); color: var(--text); }
    .verchip { font-size: var(--fs-100); font-family: var(--font-mono); color: var(--faint); background: var(--surface-3); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 2px 7px; }
    .verchip.pub { color: var(--ok); background: var(--ok-weak); border-color: transparent; }
    .grow { flex: 1; }
    .count { display: inline-flex; align-items: center; gap: 5px; font-size: var(--fs-200); color: var(--muted); }
    .count rw-icon { color: var(--faint); }

    .btn { display: inline-flex; align-items: center; gap: var(--s-6); padding: var(--s-6) var(--s-12); border: 1px solid transparent; border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-200); font-weight: var(--fw-semibold); cursor: pointer; transition: background 0.1s ease, border-color 0.1s ease; }
    .btn.ghost { background: var(--surface); color: var(--muted); border-color: var(--border-strong); }
    .btn.ghost:hover { background: var(--surface-3); color: var(--text); }
    .btn.primary { background: var(--brand); color: #fff; }
    .btn.primary:hover { background: var(--brand-hover); }
    .btn.primary:active { background: var(--brand-pressed); }

    .body { flex: 1; min-height: 0; display: grid; grid-template-columns: 256px 1fr; }

    /* ── Palette ─────────────────────────────────────────────────────────── */
    .palette { background: var(--surface); border-right: 1px solid var(--border); overflow-y: auto; padding: var(--s-16) var(--s-12); }
    .pal-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: var(--s-12); padding: 0 var(--s-4); }
    .pal-title { font-size: var(--fs-300); font-weight: var(--fw-bold); }
    .pal-tip { font-size: var(--fs-100); color: var(--faint); }
    .pal-group { margin-bottom: var(--s-16); }
    .pal-cat { font-size: var(--fs-100); text-transform: uppercase; letter-spacing: 0.06em; color: var(--faint); font-weight: var(--fw-bold); margin: 0 0 var(--s-6) var(--s-4); }
    .pal-item { display: flex; align-items: center; gap: var(--s-10); width: 100%; text-align: left; padding: var(--s-8) var(--s-10); margin-bottom: var(--s-4); cursor: grab; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); font: inherit; color: inherit; transition: background 0.1s ease, border-color 0.1s ease, box-shadow 0.1s ease; }
    .pal-item:hover { background: var(--surface-2); border-color: var(--accent-border); box-shadow: var(--shadow-2); }
    .pal-item:active { cursor: grabbing; }
    .pal-ico { flex: none; width: 30px; height: 30px; display: grid; place-items: center; border-radius: var(--radius); color: #fff; background: var(--muted); }
    .pal-text { display: flex; flex-direction: column; min-width: 0; }
    .pal-label { font-size: var(--fs-300); font-weight: var(--fw-semibold); }
    .pal-hint { font-size: var(--fs-100); color: var(--faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .canvas { position: relative; min-width: 0; overflow: hidden; }

    /* ── Canvas theme ────────────────────────────────────────────────────── */
    .rw-compose nodeweave {
      display: block; width: 100%; height: 100%;
      --nw-bg-color: #f3f1f5;
      --nw-bg-pattern: #dad5e2;
      --nw-node-bg: #ffffff;
      --nw-node-border: #e2dfe7;
      --nw-node-radius: 11px;
      --nw-selection-border: #a100ff;
      --nw-edge-color: #bdb8c8;
      --nw-edge-color-phantom: #cd94ff;
      --nw-port-color: #cfcbd8;
      --nw-port-border-color: #b6b1c2;
      --nw-port-hover-color: #a100ff;
      --nw-port-label-color: #9a95a4;
    }
    .rw-compose .vc-node { box-shadow: var(--shadow-2); }
    .rw-compose .vc-node.vc-selected { box-shadow: 0 6px 18px rgba(161, 0, 255, 0.24); }

    /* ── Inspector retint (library uses indigo) ──────────────────────────── */
    .rw-compose .inspector { border-radius: var(--radius-lg); box-shadow: var(--shadow-16); border-color: var(--border); }
    .rw-compose .inspector header { background: var(--surface-2); border-color: var(--border); }
    .rw-compose .inspector .field input:focus,
    .rw-compose .inspector .field select:focus,
    .rw-compose .inspector .field textarea:focus { border-color: var(--brand) !important; box-shadow: 0 0 0 3px rgba(161, 0, 255, 0.15) !important; }
  `,
})
export class ComposePageComponent {
  readonly vm = inject(ComposeViewModel);
  readonly cvRef = viewChild(VisualCanvasComponent);
  readonly wrap = viewChild<ElementRef<HTMLElement>>('wrap');

  readonly catalog = processCatalog;
  readonly paletteGroups = processCatalog.byCategory();
  readonly nodeTypes = processCatalog.nodeTypes();
  readonly justPublished = signal(false);
  #addCounter = 0;

  // Exposed for the template.
  readonly stepIcon = stepIcon;
  readonly stepColor = stepColor;

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
      const p = this.vm.pathway();
      if (cv) buildTemplate(cv.service, p);
    });
  }

  reset(): void {
    const cv = this.cvRef();
    if (cv) buildTemplate(cv.service, this.vm.pathway());
  }

  async publish(service: VisualCanvasService): Promise<void> {
    const ok = await this.vm.publish(service.toJSON());
    if (ok) {
      this.justPublished.set(true);
      setTimeout(() => this.justPublished.set(false), 2200);
    }
  }

  onDragStart(ev: DragEvent, item: NodeTypeDefinition): void {
    ev.dataTransfer?.setData(NW_DND_TYPE, item.type);
    ev.dataTransfer?.setData('text/plain', item.label);
    if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'copy';
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
