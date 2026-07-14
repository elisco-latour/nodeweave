import { Component, ChangeDetectionStrategy, computed, inject, input } from '@angular/core';
import { Node, VisualCanvasService } from '@build744/angular';

interface MetricConfig {
  title: string;
  aggregation: string;
  unit: string;
  v7d: string; v6w: string; v12m: string;
  t7d: number; t6w: number; t12m: number;
  hasGoal: boolean;
  goal: string;
  goalPercent: number;
}

const KIND_LABEL: Record<string, string> = {
  'metric-input': 'Metric (Input)',
  'metric-northstar': 'Metric (North Star)',
  'metric-kpi': 'Metric (KPI)',
};

/** A metric card — leading input, north-star, or KPI, chosen by node type. */
@Component({
  selector: 'app-metric-node',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card" [class]="kindKey()">
      <div class="head">
        <input
          class="title"
          [value]="cfg().title"
          (pointerdown)="$event.stopPropagation()"
          (change)="set('title', $any($event.target).value)"
          aria-label="Title"
        />
        <svg class="spark" viewBox="0 0 48 18" aria-hidden="true">
          <polyline [attr.points]="sparkPoints()" [class]="overallClass()" />
        </svg>
      </div>

      <div class="kind">
        <span class="glyph">{{ glyph() }}</span>
        {{ kindLabel() }} &middot; {{ cfg().aggregation }}
        @if (cfg().unit) { <span class="unit">· {{ cfg().unit }}</span> }
      </div>

      @if (cfg().hasGoal) {
        <div class="goal">
          <span class="goal-text">Goal &middot; {{ cfg().goal }} &middot; {{ cfg().goalPercent }}% complete</span>
          <span class="goal-bar"><span [style.width.%]="clamp(cfg().goalPercent)"></span></span>
        </div>
      }

      <div class="grid">
        @for (p of periods(); track p.label) {
          <div class="col">
            <div class="p-label">{{ p.label }}</div>
            <div class="p-value">{{ p.value }}</div>
            <div class="p-trend" [class]="trendClass(p.trend)">
              {{ trendText(p.trend) }} <span class="arrow">{{ arrow(p.trend) }}</span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .card {
      height: 100%; box-sizing: border-box;
      display: flex; flex-direction: column; gap: 8px;
      padding: 12px 14px;
      font-family: system-ui, -apple-system, sans-serif; color: #0f172a;
      border-left: 4px solid var(--accent); border-radius: inherit;
    }
    .card.input { --accent: #6366f1; }
    .card.northstar { --accent: #f59e0b; }
    .card.kpi { --accent: #8b5cf6; }

    .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
    .title {
      flex: 1; min-width: 0; font-weight: 700; font-size: 0.95rem; color: #0f172a;
      border: 1px solid transparent; border-radius: 5px; background: transparent;
      padding: 2px 4px; margin: -2px -4px; font-family: inherit;
    }
    .card.northstar .title { font-size: 1.02rem; }
    .title:hover { border-color: #e2e8f0; }
    .title:focus { outline: none; border-color: var(--accent); background: #fff; }
    .spark { width: 48px; height: 18px; flex: none; }
    .spark polyline { fill: none; stroke-width: 2; }
    .spark polyline.up { stroke: #16a34a; }
    .spark polyline.down { stroke: #dc2626; }
    .spark polyline.flat { stroke: #94a3b8; }

    .kind { display: flex; align-items: center; gap: 6px; font-size: 0.76rem; color: #64748b; }
    .glyph { color: var(--accent); font-size: 0.9rem; }
    .unit { color: #94a3b8; }

    .goal { display: flex; flex-direction: column; gap: 4px; }
    .goal-text { font-size: 0.72rem; color: #475569; }
    .goal-bar { height: 6px; border-radius: 999px; background: #eef2f7; overflow: hidden; }
    .goal-bar > span { display: block; height: 100%; background: var(--accent); border-radius: 999px; }

    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: auto; }
    .p-label { font-size: 0.66rem; color: #94a3b8; }
    .p-value { font-size: 0.9rem; font-weight: 700; color: #0f172a; }
    .p-trend { font-size: 0.72rem; font-weight: 600; }
    .p-trend.up { color: #16a34a; }
    .p-trend.down { color: #dc2626; }
    .p-trend.flat { color: #94a3b8; }
  `,
})
export class MetricNodeComponent {
  readonly node = input.required<Node>();
  readonly #svc = inject(VisualCanvasService);

  readonly cfg = computed<MetricConfig>(() => {
    this.#svc.configTick();
    return (this.node().metadata.config ?? {}) as unknown as MetricConfig;
  });

  readonly kindKey = computed(() => {
    switch (this.node().type) {
      case 'metric-northstar': return 'northstar';
      case 'metric-kpi': return 'kpi';
      default: return 'input';
    }
  });

  readonly kindLabel = computed(() => KIND_LABEL[this.node().type] ?? 'Metric');
  readonly glyph = computed(() => (this.kindKey() === 'northstar' ? '★' : this.kindKey() === 'kpi' ? '◆' : '⌾'));

  readonly periods = computed(() => {
    const c = this.cfg();
    return [
      { label: 'Past 7 days', value: c.v7d, trend: Number(c.t7d) || 0 },
      { label: 'Past 6 weeks', value: c.v6w, trend: Number(c.t6w) || 0 },
      { label: 'Past 12 months', value: c.v12m, trend: Number(c.t12m) || 0 },
    ];
  });

  readonly overallClass = computed(() => this.trendClass(this.cfg().t12m));

  sparkPoints(): string {
    // Decorative: slope the line up or down depending on the 12-month trend.
    const up = (Number(this.cfg().t12m) || 0) >= 0;
    return up ? '0,15 12,12 24,13 36,6 48,2' : '0,3 12,6 24,5 36,12 48,16';
  }

  trendClass(t: number): 'up' | 'down' | 'flat' {
    const v = Number(t) || 0;
    return v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
  }
  trendText(t: number): string {
    const v = Number(t) || 0;
    return v === 0 ? 'No change' : `${Math.abs(v)}%`;
  }
  arrow(t: number): string {
    const v = Number(t) || 0;
    return v > 0 ? '↗' : v < 0 ? '↘' : '';
  }
  clamp(n: number): number {
    return Math.max(0, Math.min(100, Number(n) || 0));
  }

  set(key: keyof MetricConfig, value: string): void {
    this.#svc.updateNodeConfig(this.node().id, { [key]: value });
  }
}
