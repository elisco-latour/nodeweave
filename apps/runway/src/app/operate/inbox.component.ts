import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { RuntimeService } from '../runtime/runtime.service';
import { StateChipComponent, type Tone } from '../shared/state-chip.component';
import { maskPersonal } from '../domain/data-dictionary';
import type { ActionItem, ActionKind } from '../domain/model';

const KIND_TONE: Record<ActionKind, Tone> = { approval: 'accent', decision: 'warn', 'human-task': 'info', triage: 'danger' };
const KIND_LABEL: Record<ActionKind, string> = { approval: 'Approval', decision: 'Decision', 'human-task': 'Human task', triage: 'Triage' };
const KIND_CTA: Record<ActionKind, string> = { approval: 'Approve', decision: 'Confirm', 'human-task': 'Mark done', triage: 'Resolve' };

/** The Action Inbox: the calm, high-signal home surface — only what needs a person. */
@Component({
  selector: 'rw-inbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StateChipComponent],
  template: `
    <header class="head">
      <div>
        <h1>Inbox</h1>
        <p class="sub">Things that need a person. Everything else, the agent is handling.</p>
      </div>
      <span class="count">{{ items().length }} open</span>
    </header>

    @if (items().length === 0) {
      <div class="empty">
        <div class="tick">✓</div>
        <p>You're all caught up. No decisions or human steps are waiting.</p>
      </div>
    }

    <div class="list">
      @for (a of items(); track a.id) {
        <article class="card" [attr.data-kind]="a.kind">
          <div class="top">
            <rw-chip [label]="kindLabel(a)" [tone]="kindTone(a)"></rw-chip>
            <span class="ref">{{ a.caseRef }}</span>
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
            <div class="rec"><span class="lbl">Recommended</span>{{ a.recommendation }}</div>
          }
          @if (a.evidence) {
            <div class="evidence"><span class="lbl">Evidence</span>{{ a.evidence }}</div>
          }

          <div class="actions">
            <button type="button" class="primary" (click)="rt.resolveAction(a.id)">{{ cta(a) }}</button>
            <button type="button" class="ghost" (click)="rt.dismissAction(a.id)">Dismiss</button>
          </div>
        </article>
      }
    </div>
  `,
  styles: `
    :host { display: block; max-width: 820px; margin: 0 auto; padding: 28px 24px 60px; }
    .head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
    h1 { margin: 0; font-size: 1.5rem; letter-spacing: -0.01em; }
    .sub { margin: 4px 0 0; color: var(--muted); font-size: 0.9rem; }
    .count { font-size: 0.8rem; color: var(--muted); background: var(--surface); border: 1px solid var(--border); padding: 4px 10px; border-radius: 999px; }

    .empty { text-align: center; color: var(--muted); padding: 60px 0; }
    .empty .tick { width: 46px; height: 46px; margin: 0 auto 14px; border-radius: 50%; background: var(--ok-weak); color: var(--ok); display: grid; place-items: center; font-size: 1.4rem; font-weight: 700; }

    .list { display: flex; flex-direction: column; gap: 14px; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow-sm); padding: 16px 18px; }
    .top { display: flex; align-items: center; gap: 10px; font-size: 0.78rem; color: var(--muted); margin-bottom: 8px; }
    .top .ref { font-weight: 600; color: var(--text); }
    .top .grow { flex: 1; }
    h2 { margin: 2px 0 6px; font-size: 1.02rem; }
    .reason { margin: 0; color: var(--muted); font-size: 0.9rem; line-height: 1.5; }

    .impacted { display: flex; align-items: center; gap: 6px; margin-top: 12px; flex-wrap: wrap; }
    .tag { font-size: 0.72rem; background: var(--surface-2); border: 1px solid var(--border); color: var(--muted); padding: 1px 8px; border-radius: 6px; }
    .lbl { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--faint); font-weight: 700; margin-right: 8px; }

    .rec { margin-top: 12px; padding: 10px 12px; background: var(--accent-weak); border-radius: var(--radius-sm); color: #3730a3; font-size: 0.86rem; line-height: 1.45; }
    .evidence { margin-top: 8px; font-size: 0.78rem; color: var(--faint); font-family: ui-monospace, Menlo, monospace; }

    .actions { display: flex; gap: 8px; margin-top: 16px; }
    .actions button { padding: 8px 16px; border-radius: var(--radius-sm); font: inherit; font-size: 0.84rem; font-weight: 600; cursor: pointer; border: 1px solid transparent; }
    .actions .primary { background: var(--accent); color: #fff; }
    .actions .primary:hover { background: #4338ca; }
    .actions .ghost { background: var(--surface); color: var(--muted); border-color: var(--border); }
    .actions .ghost:hover { background: var(--surface-2); }
  `,
})
export class InboxComponent {
  readonly rt = inject(RuntimeService);
  readonly items = computed(() => this.rt.openActions());

  kindTone(a: ActionItem): Tone { return KIND_TONE[a.kind]; }
  kindLabel(a: ActionItem): string { return KIND_LABEL[a.kind]; }
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
