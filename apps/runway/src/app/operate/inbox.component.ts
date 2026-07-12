import { Component, ChangeDetectionStrategy, computed, effect, inject, signal } from '@angular/core';
import { RuntimeService } from '../runtime/runtime.service';
import { ShellService } from '../shell/shell.service';
import { StateChipComponent, type Tone } from '../shared/state-chip.component';
import { IconComponent, type IconName } from '../shared/icon.component';
import { maskPersonal } from '../domain/data-dictionary';
import type { ActionItem, ActionKind } from '../domain/model';

const KIND_TONE: Record<ActionKind, Tone> = { approval: 'accent', decision: 'warn', 'human-task': 'info', triage: 'danger' };
const KIND_LABEL: Record<ActionKind, string> = { approval: 'Approval', decision: 'Decision', 'human-task': 'Human task', triage: 'Triage' };
const KIND_CTA: Record<ActionKind, string> = { approval: 'Approve', decision: 'Confirm', 'human-task': 'Mark done', triage: 'Resolve' };
const KIND_ICON: Record<ActionKind, IconName> = { approval: 'check-circle', decision: 'split', 'human-task': 'person', triage: 'alert-urgent' };

/** The Action Inbox: the calm, high-signal home surface — only what needs a person. */
@Component({
  selector: 'rw-inbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StateChipComponent, IconComponent],
  template: `
    <div class="wrap">
      <header class="head">
        <div>
          <h1>Inbox</h1>
          <p class="sub">Things that need a person. Everything else, the agent is handling.</p>
        </div>
        <span class="count">{{ items().length }} open</span>
      </header>

      @if (items().length === 0) {
        <div class="empty">
          <div class="tick"><rw-icon name="check-circle-filled" [size]="30" /></div>
          <p>You're all caught up. No decisions or human steps are waiting.</p>
        </div>
      }

      <div class="list">
        @for (a of items(); track a.id) {
          <article class="card" [id]="'act-' + a.id" [attr.data-kind]="a.kind" [class.flash]="a.id === highlightId()">
            <div class="top">
              <rw-chip [label]="kindLabel(a)" [tone]="kindTone(a)" [icon]="kindIcon(a)" />
              <span class="ref">{{ a.caseRef }}</span>
              <span class="sep">·</span>
              <span class="joiner">{{ joiner(a) }}</span>
              <span class="grow"></span>
              <span class="ago">{{ ago(a.createdAt) }}</span>
            </div>

            <h2>{{ a.title }}</h2>
            <p class="reason">{{ a.reason }}</p>

            @if (a.impactedItems.length) {
              <div class="impacted">
                <span class="lbl">Impacts</span>
                @for (it of a.impactedItems; track it) { <span class="tag">{{ it }}</span> }
              </div>
            }

            @if (a.recommendation) {
              <div class="rec">
                <rw-icon name="flash" [size]="16" />
                <div><span class="lbl">Recommended</span>{{ a.recommendation }}</div>
              </div>
            }
            @if (a.evidence) {
              <div class="evidence"><span class="lbl">Evidence</span>{{ a.evidence }}</div>
            }

            <div class="actions">
              <button type="button" class="btn primary" (click)="rt.resolveAction(a.id)">
                <rw-icon name="check" [size]="16" />{{ cta(a) }}
              </button>
              <button type="button" class="btn ghost" (click)="rt.dismissAction(a.id)">
                <rw-icon name="dismiss" [size]="16" />Dismiss
              </button>
            </div>
          </article>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .wrap { max-width: 860px; margin: 0 auto; padding: var(--s-32) var(--s-24) 64px; }
    .head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: var(--s-24); }
    h1 { margin: 0; font-family: var(--font-display); font-size: var(--fs-600); font-weight: var(--fw-bold); letter-spacing: -0.02em; }
    .sub { margin: var(--s-4) 0 0; color: var(--muted); font-size: var(--fs-300); }
    .count { font-size: var(--fs-200); font-weight: var(--fw-semibold); color: var(--muted); background: var(--surface); border: 1px solid var(--border); padding: var(--s-4) var(--s-10); border-radius: var(--radius-pill); }

    .empty { text-align: center; color: var(--muted); padding: 72px 0; }
    .empty .tick { width: 56px; height: 56px; margin: 0 auto var(--s-16); border-radius: 50%; background: var(--ok-weak); color: var(--ok); display: grid; place-items: center; }

    .list { display: flex; flex-direction: column; gap: var(--s-12); }
    .card {
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg);
      box-shadow: var(--shadow-2); padding: var(--s-16) var(--s-20); position: relative;
      transition: box-shadow 0.12s ease, border-color 0.12s ease;
    }
    .card::before {
      content: ''; position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: var(--radius-pill);
      background: var(--k-tone, var(--border-strong));
    }
    .card[data-kind="triage"]     { --k-tone: var(--danger); }
    .card[data-kind="decision"]   { --k-tone: var(--warn); }
    .card[data-kind="human-task"] { --k-tone: var(--info); }
    .card[data-kind="approval"]   { --k-tone: var(--accent); }
    .card:hover { box-shadow: var(--shadow-8); border-color: var(--border-strong); }
    .card.flash { animation: rw-flash 2.2s ease; }
    @keyframes rw-flash {
      0% { border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-weak-2), var(--shadow-8); }
      70% { border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-weak-2), var(--shadow-8); }
      100% { border-color: var(--border); box-shadow: var(--shadow-2); }
    }

    .top { display: flex; align-items: center; gap: var(--s-8); font-size: var(--fs-200); color: var(--muted); margin-bottom: var(--s-8); }
    .top .ref { font-weight: var(--fw-semibold); color: var(--text); }
    .top .sep { color: var(--faint); }
    .top .joiner { color: var(--muted); }
    .top .grow { flex: 1; }
    .top .ago { color: var(--faint); }

    h2 { margin: var(--s-2) 0 var(--s-6); font-size: var(--fs-400); font-weight: var(--fw-semibold); letter-spacing: -0.01em; }
    .reason { margin: 0; color: var(--muted); font-size: var(--fs-300); line-height: 1.5; }

    .impacted { display: flex; align-items: center; gap: var(--s-6); margin-top: var(--s-12); flex-wrap: wrap; }
    .tag { font-size: var(--fs-100); font-weight: var(--fw-medium); background: var(--surface-3); border: 1px solid var(--border); color: var(--muted); padding: 1px var(--s-8); border-radius: var(--radius-sm); }
    .lbl { font-size: var(--fs-100); text-transform: uppercase; letter-spacing: 0.06em; color: var(--faint); font-weight: var(--fw-bold); margin-right: var(--s-8); }

    .rec { display: flex; gap: var(--s-8); margin-top: var(--s-12); padding: var(--s-10) var(--s-12); background: var(--accent-weak); border: 1px solid var(--accent-border); border-radius: var(--radius); color: var(--accent-strong); font-size: var(--fs-300); line-height: 1.45; }
    .rec rw-icon { color: var(--accent); flex: none; margin-top: 1px; }
    .rec .lbl { display: block; margin: 0 0 2px; color: var(--accent); }
    .evidence { margin-top: var(--s-8); font-size: var(--fs-200); color: var(--faint); font-family: var(--font-mono); }
    .evidence .lbl { font-family: var(--font); }

    .actions { display: flex; gap: var(--s-8); margin-top: var(--s-16); }
    .btn {
      display: inline-flex; align-items: center; gap: var(--s-6); padding: var(--s-8) var(--s-16); border-radius: var(--radius-sm);
      font: inherit; font-size: var(--fs-300); font-weight: var(--fw-semibold); cursor: pointer; border: 1px solid transparent;
      transition: background 0.1s ease, border-color 0.1s ease;
    }
    .btn.primary { background: var(--brand); color: var(--brand-fg); }
    .btn.primary:hover { background: var(--brand-hover); }
    .btn.primary:active { background: var(--brand-pressed); }
    .btn.ghost { background: var(--surface); color: var(--muted); border-color: var(--border-strong); }
    .btn.ghost:hover { background: var(--surface-3); color: var(--text); }
  `,
})
export class InboxComponent {
  readonly rt = inject(RuntimeService);
  readonly #shell = inject(ShellService);
  readonly items = computed(() => this.rt.openActions());
  readonly highlightId = signal<string | null>(null);

  constructor() {
    // When search (or elsewhere) asks to focus an action, scroll to it and flash it.
    effect(() => {
      const id = this.#shell.focusActionId();
      if (!id) return;
      this.highlightId.set(id);
      setTimeout(() => document.getElementById('act-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      setTimeout(() => { this.highlightId.set(null); this.#shell.consumeFocusAction(); }, 2300);
    });
  }

  kindTone(a: ActionItem): Tone { return KIND_TONE[a.kind]; }
  kindLabel(a: ActionItem): string { return KIND_LABEL[a.kind]; }
  kindIcon(a: ActionItem): IconName { return KIND_ICON[a.kind]; }
  cta(a: ActionItem): string { return KIND_CTA[a.kind]; }

  joiner(a: ActionItem): string {
    const rec = this.rt.caseByRef(a.caseRef);
    return rec ? maskPersonal(rec.joinerName, this.rt.piiAuthorized()) : a.caseRef;
  }

  ago(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const h = Math.floor(ms / 3.6e6);
    if (h < 1) return 'just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
}
