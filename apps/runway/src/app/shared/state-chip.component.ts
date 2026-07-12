import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import type { ReadinessState, ReadinessItemState } from '../domain/model';
import { IconComponent, type IconName } from './icon.component';

export type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'idle' | 'accent';

export function stateTone(state: ReadinessState): Tone {
  switch (state) {
    case 'ready-for-day-1': return 'ok';
    case 'completed': return 'ok';
    case 'blocked': return 'danger';
    case 'exception': return 'danger';
    case 'waiting-for-info': return 'warn';
    case 'in-progress': return 'info';
    case 'cancelled': return 'idle';
    default: return 'idle';
  }
}

export function itemTone(state: ReadinessItemState): Tone {
  switch (state) {
    case 'done': return 'ok';
    case 'blocked': return 'danger';
    case 'awaiting-human': return 'warn';
    case 'in-progress': return 'info';
    case 'skipped': return 'idle';
    default: return 'idle';
  }
}

export const ITEM_STATE_LABEL: Record<ReadinessItemState, string> = {
  pending: 'Pending',
  'in-progress': 'In progress',
  'awaiting-human': 'Awaiting human',
  blocked: 'Blocked',
  done: 'Done',
  skipped: 'N/A',
};

/** A small status pill — a leading dot, or a Fluent icon when one is supplied. */
@Component({
  selector: 'rw-chip',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <span class="chip" [attr.data-tone]="tone()">
      @if (icon(); as ic) { <rw-icon [name]="ic" [size]="13" /> }
      @else { <span class="dot"></span> }
      {{ label() }}
    </span>
  `,
  styles: `
    .chip {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 2px 9px 2px 7px; border-radius: var(--radius-pill);
      font-size: var(--fs-100); font-weight: var(--fw-semibold); line-height: 18px; white-space: nowrap;
      background: var(--tone-weak); color: var(--tone-strong);
    }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--tone-strong); }
    rw-icon { color: var(--tone-strong); }
    .chip[data-tone="ok"]     { --tone-weak: var(--ok-weak);     --tone-strong: var(--ok); }
    .chip[data-tone="warn"]   { --tone-weak: var(--warn-weak);   --tone-strong: var(--warn); }
    .chip[data-tone="danger"] { --tone-weak: var(--danger-weak); --tone-strong: var(--danger); }
    .chip[data-tone="info"]   { --tone-weak: var(--info-weak);   --tone-strong: var(--info); }
    .chip[data-tone="idle"]   { --tone-weak: var(--idle-weak);   --tone-strong: var(--muted); }
    .chip[data-tone="accent"] { --tone-weak: var(--accent-weak); --tone-strong: var(--accent); }
  `,
})
export class StateChipComponent {
  readonly label = input.required<string>();
  readonly tone = input<Tone>('idle');
  readonly icon = input<IconName | undefined>(undefined);
}
