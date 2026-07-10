import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { MetricsCanvasComponent } from './metrics/metrics-canvas.component';
import { BasicDemoComponent } from './basic-demo.component';
import { PpsoBuilderComponent } from './ppso/ppso-builder.component';

type View = 'ppso' | 'metrics' | 'basic';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MetricsCanvasComponent, BasicDemoComponent, PpsoBuilderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="appnav">
      <strong class="brand">nodeweave</strong>
      <button type="button" [class.active]="view() === 'ppso'" (click)="view.set('ppso')">
        PPSO builder
      </button>
      <button type="button" [class.active]="view() === 'metrics'" (click)="view.set('metrics')">
        Metrics canvas
      </button>
      <button type="button" [class.active]="view() === 'basic'" (click)="view.set('basic')">
        Basic demo
      </button>
    </nav>

    <div class="viewport">
      @switch (view()) {
        @case ('ppso') { <app-ppso-builder></app-ppso-builder> }
        @case ('metrics') { <app-metrics-canvas></app-metrics-canvas> }
        @case ('basic') { <app-basic-demo></app-basic-demo> }
      }
    </div>
  `,
  styles: `
    :host { display: grid; grid-template-rows: auto 1fr; height: 100vh; }
    .appnav {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 14px; background: #0f172a; color: #fff;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .appnav .brand { margin-right: 8px; letter-spacing: -0.01em; }
    .appnav button {
      padding: 5px 12px; border: 1px solid #334155; background: transparent; color: #cbd5e1;
      border-radius: 999px; font: inherit; font-size: 0.82rem; cursor: pointer;
    }
    .appnav button.active { background: #6366f1; border-color: #6366f1; color: #fff; }
    .viewport { min-height: 0; height: 100%; overflow: hidden;}
  `,
})
export class AppComponent {
  readonly view = signal<View>('ppso');
}
