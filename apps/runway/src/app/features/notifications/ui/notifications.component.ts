import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ShellService } from '../../../shell/shell.service';
import { IconComponent, type IconName } from '../../../shared/icon.component';
import type { Tone } from '../../../shared/state-chip.component';
import { NotificationsViewModel } from '../state/notifications.view-model';
import type { Notification } from '../domain/notification.entity';
import { EVENT_ICON, EVENT_TONE, notifAgo } from './notification-presentation';

/**
 * Notifications bell — a recent-activity feed across all cases (distinct from
 * the action queue). Smart shell widget: provides and binds the
 * NotificationsViewModel; navigation goes through the ShellService facade.
 */
@Component({
  selector: 'rw-notifications',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [NotificationsViewModel],
  template: `
    <button type="button" class="bell" [class.on]="vm.open()" (click)="vm.toggle()" title="Notifications" aria-label="Notifications">
      <rw-icon name="alert" [size]="20" />
      @if (vm.unread() > 0) { <span class="ndot">{{ vm.unreadLabel() }}</span> }
    </button>

    @if (vm.open()) {
      <div class="scrim" (click)="vm.close()"></div>
      <div class="panel" role="dialog" aria-label="Notifications">
        <div class="phead">
          <strong>Notifications</strong>
          <span class="grow"></span>
          <span class="sub">Recent activity</span>
        </div>
        <div class="feed">
          @for (e of vm.feed(); track e.id) {
            <button type="button" class="nrow" (click)="openEvent(e)">
              <span class="ico" [attr.data-tone]="toneFor(e)"><rw-icon [name]="iconFor(e)" [size]="16" /></span>
              <span class="nbody">
                <span class="nsum">{{ e.summary }}</span>
                <span class="nmeta">
                  <span class="actor" [attr.data-actor]="e.actor">{{ e.actor }}</span>
                  <span class="dot">·</span>
                  <span class="ref">{{ e.caseRef }}</span>
                  <span class="grow"></span>
                  <span class="ago">{{ ago(e.at) }}</span>
                </span>
              </span>
            </button>
          } @empty {
            <div class="nempty"><rw-icon name="check-circle" [size]="24" /><p>No activity yet.</p></div>
          }
        </div>
      </div>
    }
  `,
  styles: `
    :host { position: relative; display: inline-flex; }
    .bell { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border: none; background: transparent; color: var(--chrome-fg-muted); border-radius: var(--radius-sm); cursor: pointer; transition: background 0.1s ease, color 0.1s ease; }
    .bell:hover, .bell.on { background: var(--chrome-hover); color: #fff; }
    .ndot { position: absolute; top: 2px; right: 2px; min-width: 15px; height: 15px; padding: 0 3px; border-radius: var(--radius-pill); background: #e0113b; color: #fff; font-size: 9px; font-weight: var(--fw-bold); display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 0 0 2px var(--chrome-bg); }

    .scrim { position: fixed; inset: 0; z-index: 90; }
    .panel { position: absolute; top: calc(100% + 8px); right: 0; z-index: 100; width: min(380px, calc(100vw - 24px)); max-height: 70vh; display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-28); overflow: hidden; animation: pop 0.14s ease; }
    .phead { display: flex; align-items: baseline; gap: var(--s-8); padding: var(--s-12) var(--s-16); border-bottom: 1px solid var(--border); }
    .phead strong { font-size: var(--fs-400); color: var(--text); }
    .phead .grow { flex: 1; }
    .phead .sub { font-size: var(--fs-100); text-transform: uppercase; letter-spacing: 0.05em; color: var(--faint); font-weight: var(--fw-bold); }

    .feed { overflow-y: auto; padding: var(--s-4); min-height: 0; }
    .nrow { display: flex; gap: var(--s-10); width: 100%; text-align: left; padding: var(--s-8) var(--s-10); border: none; background: transparent; border-radius: var(--radius); cursor: pointer; }
    .nrow:hover { background: var(--surface-3); }
    .ico { flex: none; display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--tone-weak, var(--surface-3)); color: var(--tone-strong, var(--muted)); }
    .ico[data-tone="ok"]     { --tone-weak: var(--ok-weak);     --tone-strong: var(--ok); }
    .ico[data-tone="warn"]   { --tone-weak: var(--warn-weak);   --tone-strong: var(--warn); }
    .ico[data-tone="danger"] { --tone-weak: var(--danger-weak); --tone-strong: var(--danger); }
    .ico[data-tone="info"]   { --tone-weak: var(--info-weak);   --tone-strong: var(--info); }
    .ico[data-tone="idle"]   { --tone-weak: var(--idle-weak);   --tone-strong: var(--muted); }
    .nbody { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .nsum { font-size: var(--fs-300); color: var(--text); line-height: 1.35; }
    .nmeta { display: flex; align-items: center; gap: var(--s-6); font-size: var(--fs-100); color: var(--faint); }
    .nmeta .actor { text-transform: uppercase; letter-spacing: 0.04em; font-weight: var(--fw-bold); }
    .nmeta .actor[data-actor="agent"] { color: var(--accent); }
    .nmeta .actor[data-actor="human"] { color: var(--info); }
    .nmeta .ref { font-weight: var(--fw-semibold); color: var(--muted); }
    .nmeta .grow { flex: 1; }
    .nempty { text-align: center; color: var(--faint); padding: 40px 16px; }
    .nempty rw-icon { color: var(--ok); }
    .nempty p { margin: var(--s-8) 0 0; font-size: var(--fs-200); }

    @keyframes pop { from { opacity: 0; transform: translateY(-4px); } }
  `,
})
export class NotificationsComponent {
  readonly vm = inject(NotificationsViewModel);
  readonly #shell = inject(ShellService);

  iconFor(n: Notification): IconName { return EVENT_ICON[n.type] ?? 'info'; }
  toneFor(n: Notification): Tone { return EVENT_TONE[n.type] ?? 'info'; }
  ago(iso: string): string { return notifAgo(iso); }

  openEvent(n: Notification): void {
    this.vm.close();
    this.#shell.openCase(n.caseRef);
  }
}
