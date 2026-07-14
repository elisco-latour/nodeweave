import { Component, ChangeDetectionStrategy, computed, inject, input } from '@angular/core';
import { Node, VisualCanvasService } from '@build744/nodeweave-angular';

interface ProjectConfig {
  title: string;
  source: string;
  issues: number;
  percent: number;
  status: 'To do' | 'In progress' | 'Done';
}

/** A tracked initiative card (Asana/Jira epic) with progress + status. */
@Component({
  selector: 'app-project-node',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <div class="row top">
        <input
          class="title"
          [value]="cfg().title"
          (pointerdown)="$event.stopPropagation()"
          (change)="set('title', $any($event.target).value)"
          aria-label="Title"
        />
        <span class="details">Details ↗</span>
      </div>

      <div class="source">
        <span class="tick" [class]="'s-' + statusKey()"></span>
        {{ cfg().source }}
      </div>

      <div class="progress">
        <span class="bar" [class]="'s-' + statusKey()" [style.width.%]="clampPercent()"></span>
      </div>

      <div class="row foot">
        <span class="meta">{{ cfg().issues }} issues &middot; {{ cfg().percent }}% done</span>
        <span class="badge" [class]="'s-' + statusKey()">{{ cfg().status }}</span>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .card {
      height: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 12px 14px;
      font-family: system-ui, -apple-system, sans-serif;
      color: #0f172a;
    }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .title {
      flex: 1; min-width: 0;
      font-weight: 700; font-size: 0.95rem; color: #0f172a;
      border: 1px solid transparent; border-radius: 5px;
      background: transparent; padding: 2px 4px; margin: -2px -4px;
      font-family: inherit;
    }
    .title:hover { border-color: #e2e8f0; }
    .title:focus { outline: none; border-color: #6366f1; background: #fff; }
    .details { font-size: 0.72rem; color: #6366f1; white-space: nowrap; }
    .source { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: #475569; }
    .tick { width: 9px; height: 9px; border-radius: 3px; }
    .progress { height: 6px; border-radius: 999px; background: #eef2f7; overflow: hidden; }
    .bar { display: block; height: 100%; border-radius: 999px; }
    .foot .meta { font-size: 0.72rem; color: #64748b; }
    .badge {
      font-size: 0.68rem; font-weight: 600; padding: 2px 8px; border-radius: 999px; color: #fff;
    }
    .s-todo { background: #f59e0b; }
    .s-progress { background: #22c55e; }
    .s-done { background: #3b82f6; }
    .progress .s-todo, .progress .s-progress, .progress .s-done { color: transparent; }
  `,
})
export class ProjectNodeComponent {
  readonly node = input.required<Node>();
  readonly #svc = inject(VisualCanvasService);

  readonly cfg = computed<ProjectConfig>(() => {
    this.#svc.configTick();
    return (this.node().metadata.config ?? {}) as unknown as ProjectConfig;
  });

  readonly statusKey = computed(() => {
    switch (this.cfg().status) {
      case 'Done': return 'done';
      case 'To do': return 'todo';
      default: return 'progress';
    }
  });

  clampPercent(): number {
    return Math.max(0, Math.min(100, Number(this.cfg().percent) || 0));
  }

  set(key: keyof ProjectConfig, value: string): void {
    this.#svc.updateNodeConfig(this.node().id, { [key]: value });
  }
}
