import { Component, ChangeDetectionStrategy, computed, inject, input } from '@angular/core';
import { Node, VisualCanvasService } from '@nodeweave/angular';
import { IconComponent } from '../../../shared/icon.component';
import { stepIcon, stepColor, stepKindLabel } from './step-visuals';

/** Editable process step on the Compose canvas. Colour/icon from the type. */
@Component({
  selector: 'rw-step-node',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="step" [style.--step]="color()">
      <span class="rail"></span>
      <div class="body">
        <div class="head">
          <span class="icon"><rw-icon [name]="icon()" [size]="14" /></span>
          <input class="title" [value]="title()" (pointerdown)="$event.stopPropagation()"
                 (change)="setTitle($any($event.target).value)" aria-label="Step title" />
        </div>
        <div class="kind">{{ kindLabel() }}@if (subtype()) {<span class="sub"> · {{ subtype() }}</span>}</div>
        @for (row of preview(); track row.k) {
          <div class="param"><span class="k">{{ row.k }}</span><span class="v">{{ row.v }}</span></div>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .step { position: relative; height: 100%; box-sizing: border-box; display: flex; overflow: hidden; border-radius: inherit; font-family: var(--font); color: var(--grey-14, #242130); }
    .rail { flex: none; width: 4px; background: var(--step, #655f72); }
    .body { flex: 1; min-width: 0; padding: 8px 11px; display: flex; flex-direction: column; gap: 3px; }
    .head { display: flex; align-items: center; gap: 7px; }
    .icon { flex: none; width: 22px; height: 22px; display: grid; place-items: center; border-radius: 6px; color: #fff; background: var(--step, #655f72); }
    .title { flex: 1; min-width: 0; font-weight: 600; font-size: 0.82rem; color: #242130; border: 1px solid transparent; border-radius: 5px; background: transparent; padding: 1px 4px; margin: -1px -4px; font-family: inherit; }
    .title:hover { border-color: #e2dfe7; }
    .title:focus { outline: none; border-color: var(--step, #7500c0); background: #fff; }
    .kind { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.05em; color: #7c7689; font-weight: 700; }
    .kind .sub { color: #9a95a4; text-transform: none; letter-spacing: 0; font-weight: 400; }
    .param { display: flex; gap: 6px; font-size: 0.68rem; line-height: 1.3; }
    .param .k { color: #9a95a4; flex: none; }
    .param .v { color: #655f72; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  `,
})
export class StepNodeComponent {
  readonly node = input.required<Node>();
  readonly #svc = inject(VisualCanvasService);

  readonly cfg = computed<Record<string, unknown>>(() => {
    this.#svc.configTick();
    return (this.node().metadata.config ?? {}) as Record<string, unknown>;
  });
  readonly icon = computed(() => stepIcon(this.node().type));
  readonly color = computed(() => stepColor(this.node().type));
  readonly kindLabel = computed(() => stepKindLabel(this.node().type));
  readonly subtype = computed(() => this.node().type.split('.')[1] ?? '');
  readonly title = computed(() => (this.cfg()['title'] as string) || this.node().type);
  readonly preview = computed(() =>
    Object.entries(this.cfg())
      .filter(([k, v]) => k !== 'title' && v !== '' && v != null)
      .slice(0, 2)
      .map(([k, v]) => { const s = String(v); return { k, v: s.length > 30 ? s.slice(0, 29) + '…' : s }; }),
  );

  setTitle(value: string): void {
    this.#svc.updateNodeConfig(this.node().id, { title: value });
  }
}
