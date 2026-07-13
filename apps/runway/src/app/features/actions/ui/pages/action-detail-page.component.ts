import { Component, ChangeDetectionStrategy, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GovernanceService } from '../../../../core/governance/governance.service';
import { StateChipComponent } from '../../../../shared/state-chip.component';
import { IconComponent } from '../../../../shared/icon.component';
import type { Action } from '../../domain/action.entity';
import { InboxViewModel } from '../../state/inbox.view-model';
import { KIND_TONE, KIND_LABEL, KIND_CTA, KIND_ICON, STATUS_LABEL, actionAgo } from '../action-presentation';

/** Smart page — the Inbox reading pane (/inbox/:actionId). Shares the route's InboxViewModel. */
@Component({
  selector: 'rw-action-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StateChipComponent, IconComponent],
  template: `
    @if (action(); as a) {
      <div class="page">
        <div class="dhead">
          <rw-chip [label]="kindLabel(a)" [tone]="tone(a)" [icon]="icon(a)" />
          <span class="status" [attr.data-s]="a.status">
            @if (!a.isOpen) { <rw-icon [name]="a.isResolved ? 'check-circle' : 'minus-circle'" [size]="14" /> }
            {{ statusLabel(a) }}
          </span>
          <span class="grow"></span>
          <a class="viewcase" [routerLink]="['/cases', a.caseRef]">View case <rw-icon name="chevron-right" [size]="14" /></a>
        </div>

        <div class="scroll">
          <h1>{{ a.title }}</h1>
          <div class="meta"><span class="ref">{{ a.caseRef }}</span><span class="dot">·</span>{{ joiner(a) }}<span class="dot">·</span>{{ ago(a.createdAt) }}</div>

          <div class="agent">
            <span class="avatar"><rw-icon name="bot" [size]="18" /></span>
            <div class="bubble">
              <div class="who">Agent <span class="muted">— why this needs you</span></div>
              <p class="reason">{{ a.reason }}</p>
              @if (a.recommendation) {
                <div class="rec"><rw-icon name="flash" [size]="16" /><div><span class="lbl">Recommended</span>{{ a.recommendation }}</div></div>
              }
            </div>
          </div>

          @if (a.impactedItems.length) {
            <div class="block">
              <span class="lbl">Impacted readiness items</span>
              <div class="tags">@for (it of a.impactedItems; track it) { <span class="tag">{{ it }}</span> }</div>
            </div>
          }
          @if (a.evidence) {
            <div class="block"><span class="lbl">Evidence</span><div class="evidence">{{ a.evidence }}</div></div>
          }
        </div>

        <div class="actionbar">
          @if (a.isOpen) {
            <button type="button" class="btn primary" (click)="vm.resolve(a.id)"><rw-icon name="check" [size]="16" />{{ cta(a) }}</button>
            <button type="button" class="btn ghost" (click)="vm.dismiss(a.id)"><rw-icon name="dismiss" [size]="16" />Dismiss</button>
          } @else {
            <button type="button" class="btn primary" disabled><rw-icon name="check" [size]="16" />{{ cta(a) }}</button>
            <button type="button" class="btn ghost" disabled><rw-icon name="dismiss" [size]="16" />Dismiss</button>
            <span class="grow"></span>
            <span class="stamp" [attr.data-s]="a.status">
              <rw-icon [name]="a.isResolved ? 'check-circle' : 'minus-circle'" [size]="15" />
              {{ a.isResolved ? 'Resolved' : 'Dismissed' }} · logged to the case
            </span>
          }
        </div>
      </div>
    } @else {
      <div class="missing">
        <rw-icon name="error-circle" [size]="30" />
        <p>This action is no longer available.</p>
        <a routerLink="/inbox">Back to Inbox</a>
      </div>
    }
  `,
  styles: `
    :host { display: block; height: 100%; min-height: 0; }
    .page { display: flex; flex-direction: column; height: 100%; min-height: 0; background: var(--surface); }
    .dhead { flex: none; display: flex; align-items: center; gap: var(--s-10); padding: var(--s-12) var(--s-24); border-bottom: 1px solid var(--border); }
    .status { display: inline-flex; align-items: center; gap: 4px; font-size: var(--fs-100); font-weight: var(--fw-bold); text-transform: uppercase; letter-spacing: 0.05em; color: var(--faint); }
    .status[data-s="open"] { color: var(--accent); }
    .status[data-s="resolved"] { color: var(--ok); }
    .grow { flex: 1; }
    .viewcase { display: inline-flex; align-items: center; gap: 3px; font-size: var(--fs-200); font-weight: var(--fw-semibold); color: var(--accent); text-decoration: none; }
    .viewcase:hover { text-decoration: underline; }

    .scroll { flex: 1; min-height: 0; overflow-y: auto; padding: var(--s-24) var(--s-24) var(--s-16); }
    h1 { margin: 0; font-family: var(--font-display); font-size: var(--fs-500); font-weight: var(--fw-bold); letter-spacing: -0.02em; }
    .meta { display: flex; align-items: center; gap: var(--s-6); margin-top: var(--s-4); color: var(--muted); font-size: var(--fs-200); }
    .meta .ref { font-weight: var(--fw-semibold); }
    .meta .dot { color: var(--faint); }

    .agent { display: flex; gap: var(--s-12); margin-top: var(--s-20); }
    .avatar { flex: none; display: inline-grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; color: #fff; background: linear-gradient(135deg, var(--acn-40), var(--acn-70)); box-shadow: var(--shadow-2); }
    .bubble { flex: 1; min-width: 0; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius-lg); border-top-left-radius: var(--radius-xs); padding: var(--s-12) var(--s-16); }
    .who { font-size: var(--fs-200); font-weight: var(--fw-bold); color: var(--text); margin-bottom: var(--s-4); }
    .who .muted { color: var(--faint); font-weight: var(--fw-regular); }
    .reason { margin: 0; color: var(--text); font-size: var(--fs-300); line-height: 1.55; }
    .rec { display: flex; gap: var(--s-8); margin-top: var(--s-12); padding: var(--s-10) var(--s-12); background: var(--accent-weak); border: 1px solid var(--accent-border); border-radius: var(--radius); color: var(--accent-strong); font-size: var(--fs-300); line-height: 1.45; }
    .rec rw-icon { color: var(--accent); flex: none; margin-top: 1px; }
    .rec .lbl { display: block; }

    .block { margin-top: var(--s-20); }
    .lbl { display: block; font-size: var(--fs-100); text-transform: uppercase; letter-spacing: 0.06em; color: var(--faint); font-weight: var(--fw-bold); margin-bottom: var(--s-6); }
    .tags { display: flex; flex-wrap: wrap; gap: var(--s-6); }
    .tag { font-size: var(--fs-100); font-weight: var(--fw-medium); background: var(--surface-3); border: 1px solid var(--border); color: var(--muted); padding: 1px var(--s-8); border-radius: var(--radius-sm); }
    .evidence { font-size: var(--fs-200); color: var(--faint); font-family: var(--font-mono); background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius); padding: var(--s-10) var(--s-12); }

    .actionbar { flex: none; display: flex; align-items: center; gap: var(--s-8); padding: var(--s-16) var(--s-24); border-top: 1px solid var(--border); }
    .btn { display: inline-flex; align-items: center; gap: var(--s-6); padding: var(--s-8) var(--s-16); border: 1px solid transparent; border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-300); font-weight: var(--fw-semibold); cursor: pointer; }
    .btn.primary { background: var(--brand); color: #fff; }
    .btn.primary:hover:not(:disabled) { background: var(--brand-hover); }
    .btn.ghost { background: var(--surface); color: var(--muted); border-color: var(--border-strong); }
    .btn.ghost:hover:not(:disabled) { background: var(--surface-3); color: var(--text); }
    .btn:disabled { opacity: 0.5; cursor: default; }
    .stamp { display: inline-flex; align-items: center; gap: var(--s-6); font-size: var(--fs-200); font-weight: var(--fw-semibold); }
    .stamp[data-s="resolved"] { color: var(--ok); }
    .stamp[data-s="dismissed"] { color: var(--muted); }

    .missing { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--s-12); color: var(--muted); }
    .missing rw-icon { color: var(--idle); }
    .missing a { color: var(--accent); font-weight: var(--fw-semibold); }
  `,
})
export class ActionDetailPageComponent {
  readonly actionId = input.required<string>();
  readonly vm = inject(InboxViewModel);
  readonly #gov = inject(GovernanceService);
  readonly action = computed<Action | undefined>(() => this.vm.byId(this.actionId()));

  tone(a: Action) { return KIND_TONE[a.kind]; }
  icon(a: Action) { return KIND_ICON[a.kind]; }
  kindLabel(a: Action) { return KIND_LABEL[a.kind]; }
  cta(a: Action) { return KIND_CTA[a.kind]; }
  statusLabel(a: Action) { return STATUS_LABEL[a.status]; }
  ago(iso: string) { return actionAgo(iso); }
  joiner(a: Action): string { return this.#gov.mask(a.joinerName); }
}
