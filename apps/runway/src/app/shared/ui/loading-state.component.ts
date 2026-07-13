import { Component, ChangeDetectionStrategy, input } from '@angular/core';

/** Reusable centered loading indicator for a data region during a read. */
@Component({
  selector: 'rw-loading',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap" role="status" [attr.aria-label]="label()">
      <span class="spinner"></span>
      <span class="lbl">{{ label() }}</span>
    </div>
  `,
  styles: `
    :host { display: block; }
    .wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--s-12); padding: 56px 16px; color: var(--muted); }
    .spinner { width: 26px; height: 26px; border-radius: 50%; border: 2.5px solid var(--border-strong); border-top-color: var(--accent); animation: rw-spin 0.7s linear infinite; }
    .lbl { font-size: var(--fs-200); }
    @keyframes rw-spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 1.6s; } }
  `,
})
export class LoadingStateComponent {
  readonly label = input('Loading…');
}
