import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import type { ChatMessage, Op } from './copilot';
import { COPILOT_SUGGESTIONS } from './copilot';

/**
 * Presentational chat drawer for the process copilot. State (messages, the
 * pending proposal) lives in the builder; this renders it and emits intents.
 */
@Component({
  selector: 'app-copilot-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="copilot">
      <header>
        <span class="dot"></span><strong>Process copilot</strong>
        <span class="grow"></span>
        <button type="button" class="x" (click)="close.emit()" aria-label="Close">&times;</button>
      </header>

      <div class="log">
        @if (messages().length === 0) {
          <div class="intro">
            <p>Describe a change in plain language — I’ll propose it on the canvas for you to approve.</p>
            <div class="chips">
              @for (s of suggestions; track s) {
                <button type="button" class="chip" (click)="send.emit(s)">{{ s }}</button>
              }
            </div>
          </div>
        }

        @for (msg of messages(); track $index) {
          <div class="msg" [class.user]="msg.role === 'user'">
            <div class="bubble">
              <span class="text">{{ msg.text }}</span>
              @if (msg.ops?.length) {
                <ul class="ops">
                  @for (op of msg.ops; track $index) { <li>{{ describe(op) }}</li> }
                </ul>
              }
              @if (msg.status === 'pending') {
                <div class="actions">
                  <button type="button" class="approve" (click)="approve.emit()">Approve</button>
                  <button type="button" class="reject" (click)="reject.emit()">Reject</button>
                </div>
              }
              @if (msg.status === 'approved') { <span class="tag ok">Applied</span> }
              @if (msg.status === 'rejected') { <span class="tag no">Discarded</span> }
            </div>
          </div>
        }
      </div>

      <form class="composer" (submit)="submit($event, box)">
        <input #box type="text" [disabled]="pending()"
               [placeholder]="pending() ? 'Approve or reject the proposal first…' : 'Ask the copilot to change the process…'" />
        <button type="submit" [disabled]="pending()">Send</button>
      </form>
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .copilot {
      height: 100%; display: flex; flex-direction: column;
      background: #fff; border-left: 1px solid #e5e7eb;
      font-family: system-ui, -apple-system, sans-serif; color: #0f172a;
    }
    header { display: flex; align-items: center; gap: 8px; padding: 11px 13px; border-bottom: 1px solid #eef2f7; background: #f8fafc; font-size: 0.86rem; }
    header .dot { width: 8px; height: 8px; border-radius: 50%; background: #4f46e5; }
    header .grow { flex: 1; }
    header .x { border: none; background: none; font-size: 1.2rem; color: #94a3b8; cursor: pointer; padding: 0 6px; }
    header .x:hover { color: #0f172a; }

    .log { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
    .intro p { margin: 0 0 10px; font-size: 0.82rem; color: #64748b; }
    .chips { display: flex; flex-direction: column; gap: 6px; }
    .chip {
      text-align: left; padding: 7px 10px; border: 1px solid #e5e7eb; background: #f8fafc; color: #334155;
      border-radius: 8px; font: inherit; font-size: 0.76rem; cursor: pointer;
    }
    .chip:hover { background: #eef2ff; border-color: #c7d2fe; }

    .msg { display: flex; }
    .msg.user { justify-content: flex-end; }
    .bubble {
      max-width: 88%; padding: 8px 11px; border-radius: 12px; font-size: 0.8rem; line-height: 1.4;
      background: #f1f5f9; color: #0f172a;
    }
    .msg.user .bubble { background: #4f46e5; color: #fff; }
    .ops { margin: 7px 0 0; padding-left: 16px; display: flex; flex-direction: column; gap: 2px; font-size: 0.74rem; color: #475569; }
    .actions { display: flex; gap: 7px; margin-top: 9px; }
    .actions button { padding: 4px 12px; border-radius: 7px; font: inherit; font-size: 0.76rem; font-weight: 600; cursor: pointer; border: 1px solid transparent; }
    .actions .approve { background: #4f46e5; color: #fff; }
    .actions .approve:hover { background: #4338ca; }
    .actions .reject { background: #fff; color: #dc2626; border-color: #fecaca; }
    .actions .reject:hover { background: #fef2f2; }
    .tag { display: inline-block; margin-top: 7px; font-size: 0.68rem; font-weight: 700; padding: 1px 8px; border-radius: 999px; }
    .tag.ok { background: #dcfce7; color: #166534; }
    .tag.no { background: #fee2e2; color: #991b1b; }

    .composer { display: flex; gap: 8px; padding: 11px; border-top: 1px solid #eef2f7; }
    .composer input {
      flex: 1; min-width: 0; padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 8px; font: inherit; font-size: 0.82rem;
    }
    .composer input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
    .composer button { padding: 8px 14px; border: none; background: #4f46e5; color: #fff; border-radius: 8px; font: inherit; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
    .composer button:disabled, .composer input:disabled { opacity: 0.5; cursor: not-allowed; }
  `,
})
export class CopilotPanelComponent {
  readonly messages = input.required<ChatMessage[]>();
  readonly pending = input(false);

  readonly send = output<string>();
  readonly approve = output<void>();
  readonly reject = output<void>();
  readonly close = output<void>();

  readonly suggestions = COPILOT_SUGGESTIONS;

  submit(ev: Event, box: HTMLInputElement): void {
    ev.preventDefault();
    const text = box.value.trim();
    if (!text || this.pending()) return;
    this.send.emit(text);
    box.value = '';
  }

  describe(op: Op): string {
    switch (op.kind) {
      case 'addNode': return `＋ Add ${op.title ?? op.type}${op.ref ? ' (linked)' : ''}`;
      case 'connect': return `→ Connect ${op.from} to ${op.to}`;
      case 'updateConfig': return `✎ Set ${Object.keys(op.patch).join(', ')}`;
      case 'removeNode': return `－ Remove ${op.nodeId}`;
    }
  }
}
