import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { TourService } from './tour.service';
import { IconComponent } from '../shared/icon.component';

/** First-run guided tour overlay — a Fluent welcome modal walking the real surfaces. */
@Component({
  selector: 'rw-tour',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (tour.open()) {
      <div class="scrim" (click)="tour.skip()"></div>
      <div class="dialog" role="dialog" aria-modal="true" [attr.aria-label]="step().title">
        <button type="button" class="x" (click)="tour.skip()" aria-label="Close tour"><rw-icon name="dismiss" [size]="18" /></button>

        <div class="art" [attr.data-step]="tour.index()">
          <span class="halo"></span>
          <span class="glyph"><rw-icon [name]="step().icon" [size]="40" /></span>
        </div>

        <p class="eyebrow">{{ step().eyebrow }}</p>
        <h2>{{ step().title }}</h2>
        <p class="body">{{ step().body }}</p>

        <div class="dots">
          @for (s of tour.steps; track $index) {
            <span class="dot" [class.on]="$index === tour.index()"></span>
          }
        </div>

        <div class="foot">
          @if (tour.isFirst) {
            <button type="button" class="btn ghost" (click)="tour.skip()">Skip</button>
          } @else {
            <button type="button" class="btn ghost" (click)="tour.prev()"><rw-icon name="chevron-right" [size]="16" class="flip" />Back</button>
          }
          <span class="progress">{{ tour.index() + 1 }} of {{ tour.steps.length }}</span>
          <button type="button" class="btn primary" (click)="tour.next()">
            {{ tour.isLast ? 'Get started' : 'Next' }}
            @if (!tour.isLast) { <rw-icon name="chevron-right" [size]="16" /> }
          </button>
        </div>
      </div>
    }
  `,
  styles: `
    :host { position: fixed; inset: 0; z-index: 200; pointer-events: none; }
    .scrim { position: absolute; inset: 0; background: rgba(48, 0, 77, 0.42); backdrop-filter: blur(2px); pointer-events: auto; animation: fade 0.15s ease; }
    .dialog {
      position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
      width: min(440px, calc(100vw - 32px)); background: var(--surface); border-radius: var(--radius-xl);
      box-shadow: var(--shadow-28); padding: var(--s-32) var(--s-32) var(--s-20); text-align: center;
      pointer-events: auto; animation: pop 0.18s cubic-bezier(0.2, 0.9, 0.3, 1.2);
    }
    .x { position: absolute; top: var(--s-12); right: var(--s-12); display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: none; background: transparent; color: var(--faint); border-radius: var(--radius-sm); cursor: pointer; }
    .x:hover { background: var(--surface-3); color: var(--muted); }

    .art { position: relative; display: inline-grid; place-items: center; width: 96px; height: 96px; margin: var(--s-8) auto var(--s-16); }
    .halo { position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(circle at 50% 40%, var(--acn-10), var(--acn-05)); }
    .glyph { position: relative; display: inline-grid; place-items: center; width: 64px; height: 64px; border-radius: 50%; color: #fff; background: linear-gradient(135deg, var(--acn-40), var(--acn-70)); box-shadow: var(--shadow-8); }

    .eyebrow { margin: 0; font-size: var(--fs-100); text-transform: uppercase; letter-spacing: 0.08em; font-weight: var(--fw-bold); color: var(--accent); }
    h2 { margin: var(--s-4) 0 var(--s-8); font-family: var(--font-display); font-size: var(--fs-500); font-weight: var(--fw-bold); letter-spacing: -0.02em; }
    .body { margin: 0 auto; max-width: 360px; color: var(--muted); font-size: var(--fs-300); line-height: 1.55; }

    .dots { display: flex; justify-content: center; gap: var(--s-6); margin: var(--s-20) 0 var(--s-16); }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--border-strong); transition: width 0.15s ease, background 0.15s ease; }
    .dot.on { width: 18px; border-radius: var(--radius-pill); background: var(--brand); }

    .foot { display: flex; align-items: center; justify-content: space-between; gap: var(--s-12); }
    .progress { font-size: var(--fs-200); color: var(--faint); }
    .btn { display: inline-flex; align-items: center; gap: var(--s-4); padding: var(--s-8) var(--s-16); border: 1px solid transparent; border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-300); font-weight: var(--fw-semibold); cursor: pointer; }
    .btn.ghost { background: transparent; color: var(--muted); border-color: var(--border-strong); }
    .btn.ghost:hover { background: var(--surface-3); color: var(--text); }
    .btn.primary { background: var(--brand); color: #fff; }
    .btn.primary:hover { background: var(--brand-hover); }
    .flip { transform: rotate(180deg); }

    @keyframes fade { from { opacity: 0; } }
    @keyframes pop { from { opacity: 0; transform: translate(-50%, -46%) scale(0.96); } }
  `,
})
export class TourComponent {
  readonly tour = inject(TourService);
  readonly step = computed(() => this.tour.steps[this.tour.index()]);
}
