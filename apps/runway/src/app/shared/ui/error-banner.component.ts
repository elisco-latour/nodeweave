import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { IconComponent } from '../icon.component';

/**
 * Reusable error surface. Use inline over content for a command failure
 * (dismissible), or as a full error state for a failed read (with Retry).
 */
@Component({
  selector: 'rw-error-banner',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="banner" role="alert">
      <rw-icon name="error-circle" [size]="16" />
      <span class="msg">{{ message() }}</span>
      @if (showRetry()) { <button type="button" class="act" (click)="retry.emit()"><rw-icon name="refresh" [size]="14" />Retry</button> }
      @if (showDismiss()) { <button type="button" class="x" (click)="dismiss.emit()" aria-label="Dismiss"><rw-icon name="dismiss" [size]="14" /></button> }
    </div>
  `,
  styles: `
    :host { display: block; }
    .banner {
      display: flex; align-items: center; gap: var(--s-8);
      padding: var(--s-10) var(--s-12); margin: var(--s-8) var(--s-16);
      background: var(--danger-weak); border: 1px solid var(--danger-border, #f3bcbc);
      border-radius: var(--radius); color: var(--danger); font-size: var(--fs-200);
    }
    .banner rw-icon { flex: none; }
    .msg { flex: 1; min-width: 0; }
    .act { display: inline-flex; align-items: center; gap: var(--s-4); flex: none; height: 26px; padding: 0 var(--s-10); border: 1px solid var(--danger); background: transparent; color: var(--danger); border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-200); font-weight: var(--fw-semibold); cursor: pointer; }
    .act:hover { background: var(--danger); color: #fff; }
    .x { display: inline-grid; place-items: center; flex: none; width: 24px; height: 24px; border: none; background: transparent; color: var(--danger); border-radius: var(--radius-sm); cursor: pointer; opacity: 0.75; }
    .x:hover { opacity: 1; background: rgba(197, 15, 31, 0.1); }
  `,
})
export class ErrorBannerComponent {
  readonly message = input.required<string>();
  readonly showRetry = input(false);
  readonly showDismiss = input(true);
  readonly retry = output<void>();
  readonly dismiss = output<void>();
}
