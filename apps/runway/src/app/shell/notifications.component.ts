import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { RuntimeService } from '../runtime/runtime.service';
import { ShellService } from './shell.service';
import { loadJson, saveJson } from '../runtime/persist';
import { IconComponent, type IconName } from '../shared/icon.component';
import { maskPersonal } from '../domain/data-dictionary';
import type { EventType, DomainEvent } from '../domain/model';

type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'idle';

const EVENT_ICON: Record<EventType, IconName> = {
  'case.created': 'cases', 'intake.rejected': 'error-circle',
  'validation.passed': 'check-circle', 'validation.failed': 'warning',
  'item.started': 'sync', 'item.prepared': 'sync', 'item.completed': 'check-circle', 'item.blocked': 'error-circle',
  'reminder.sent': 'mail', 'escalation.raised': 'alert-urgent', 'exception.raised': 'warning',
  'action.approved': 'check', 'action.rejected': 'dismiss',
  'state.changed': 'flash', 'case.completed': 'flag', 'case.cancelled': 'minus-circle',
};
const EVENT_TONE: Record<EventType, Tone> = {
  'case.created': 'info', 'intake.rejected': 'danger',
  'validation.passed': 'ok', 'validation.failed': 'warn',
  'item.started': 'info', 'item.prepared': 'info', 'item.completed': 'ok', 'item.blocked': 'danger',
  'reminder.sent': 'info', 'escalation.raised': 'warn', 'exception.raised': 'warn',
  'action.approved': 'ok', 'action.rejected': 'idle',
  'state.changed': 'info', 'case.completed': 'ok', 'case.cancelled': 'idle',
};
const FEED_LIMIT = 40;
const SEEN_KEY = 'notifSeen';

/** Notifications bell — a recent-activity feed across all cases (distinct from the action queue). */
@Component({
  selector: 'rw-notifications',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <button type="button" class="bell" [class.on]="open()" (click)="toggle()" title="Notifications" aria-label="Notifications">
      <rw-icon name="alert" [size]="20" />
      @if (unread() > 0) { <span class="ndot">{{ unreadLabel() }}</span> }
    </button>

    @if (open()) {
      <div class="scrim" (click)="close()"></div>
      <div class="panel" role="dialog" aria-label="Notifications">
        <div class="phead">
          <strong>Notifications</strong>
          <span class="grow"></span>
          <span class="sub">Recent activity</span>
        </div>
        <div class="feed">
          @for (e of feed(); track e.id) {
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
  readonly #rt = inject(RuntimeService);
  readonly #shell = inject(ShellService);

  readonly open = signal(false);
  readonly lastSeen = signal<number>(loadJson<number>(SEEN_KEY, Date.now()));

  readonly #sorted = computed(() => [...this.#rt.allEvents()].sort((a, b) => b.at.localeCompare(a.at)));
  readonly feed = computed(() => this.#sorted().slice(0, FEED_LIMIT));
  readonly unread = computed(() => {
    const seen = this.lastSeen();
    return this.#rt.allEvents().reduce((n, e) => (new Date(e.at).getTime() > seen ? n + 1 : n), 0);
  });
  readonly unreadLabel = computed(() => (this.unread() > 99 ? '99+' : String(this.unread())));

  toggle(): void {
    const next = !this.open();
    this.open.set(next);
    if (next) this.#markSeen();
  }
  close(): void { this.open.set(false); }

  #markSeen(): void {
    const now = Date.now();
    this.lastSeen.set(now);
    saveJson(SEEN_KEY, now);
  }

  openEvent(e: DomainEvent): void {
    this.close();
    this.#shell.openCase(e.caseRef);
  }

  iconFor(e: DomainEvent): IconName { return EVENT_ICON[e.type] ?? 'info'; }
  toneFor(e: DomainEvent): Tone { return EVENT_TONE[e.type] ?? 'info'; }
  joiner(e: DomainEvent): string {
    const rec = this.#rt.caseByRef(e.caseRef);
    return rec ? maskPersonal(rec.joinerName, this.#rt.piiAuthorized()) : e.caseRef;
  }
  ago(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const h = Math.floor(ms / 3.6e6);
    if (h < 1) return 'just now';
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }
}
