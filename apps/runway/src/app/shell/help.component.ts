import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { TourService } from './tour.service';
import { ShellService } from './shell.service';
import { IconComponent, type IconName } from '../shared/icon.component';

interface Concept { icon: IconName; term: string; def: string; }
interface Faq { q: string; a: string; }

const CONCEPTS: Concept[] = [
  { icon: 'cases', term: 'Case', def: 'One onboarding — the canonical readiness record for a joiner, from intake through to Day 1.' },
  { icon: 'check-circle', term: 'Readiness item', def: 'A single thing that must be true to be ready — equipment, access, workspace, orientation, a stakeholder.' },
  { icon: 'inbox', term: 'Action Inbox', def: 'The queue of things that need a person: decisions, approvals, human tasks, and triage.' },
  { icon: 'compose', term: 'Process map', def: 'The published process for a pathway, rendered read-only and lit live by each case’s state.' },
  { icon: 'flash', term: 'Fulfilment', def: 'How an item is done — Automated (agent), Agent-assisted (agent prepares, human executes), or Human.' },
  { icon: 'eye', term: 'Governance & PII', def: 'Personal data is classified and masked by default; authoritative systems are referenced, never copied.' },
];

const FAQS: Faq[] = [
  { q: 'What does the readiness percentage mean?', a: 'It is derived, not stored: the share of a case’s non-skipped readiness items that are done. It moves as the agent and people complete work — it is never edited directly.' },
  { q: 'Why is a case blocked or waiting for information?', a: 'A validation gate did not pass — a mandatory field is missing (e.g. an EID) or two sources conflict (e.g. start dates). The case pauses and raises a triage or decision action; it resumes automatically once the information is provided.' },
  { q: 'What’s the difference between Automated, Agent-assisted, and Human?', a: 'Automated means the agent completes it via an integration. Agent-assisted means the agent prepares the work (a pre-filled block and link) and a person executes it — used where there is no API, like CDP RORO or MyTE. Human means a person owns it end to end.' },
  { q: 'How do I act on something?', a: 'Open the Inbox. Each card carries the reason, the impacted items, evidence, and a recommendation. Resolve it (which advances the case and completes any human task) or Dismiss it. Everything you do is written to the case’s activity trail.' },
  { q: 'How do I change the onboarding process?', a: 'Open Compose, pick a pathway, edit the flow on the canvas, and Publish — that creates a new version. Cases already in flight keep the version they started on; new cases run the latest.' },
  { q: 'How is personal data protected?', a: 'Every field is classified. Personal data (like a joiner’s name) is masked until an authorized viewer chooses Reveal PII in the command bar. Runway holds references, state, and outcomes — the source systems stay authoritative.' },
  { q: 'Where does work come from?', a: 'Only from approved structured intake — a form, an API, or a controlled feed — with an explicit request type. Runway never guesses intent from free-form messages.' },
];

/** Help & resources — a first-draft support surface: concepts, FAQ, and the guided tour. */
@Component({
  selector: 'rw-help',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="wrap">
      <header class="head">
        <h1>Help &amp; resources</h1>
        <p class="sub">How Runway works, what the pieces mean, and answers to common questions.</p>
      </header>

      <section class="banner">
        <span class="banner-ico"><rw-icon name="brand" [size]="24" /></span>
        <div class="banner-text">
          <strong>New to Runway?</strong>
          <span>Take the two-minute guided tour of the Inbox, Cases, and Compose.</span>
        </div>
        <button type="button" class="btn primary" (click)="tour.start()"><rw-icon name="play" [size]="16" />Start tour</button>
      </section>

      <h2 class="section">How Runway works</h2>
      <div class="modes">
        <article class="mode" (click)="go('inbox')">
          <span class="mode-ico op"><rw-icon name="inbox" [size]="20" /></span>
          <h3>Operate</h3>
          <p>Supervise live onboardings. The <b>Inbox</b> surfaces only what needs a person; <b>Cases</b> shows each joiner’s readiness, blockers, owners, and process map.</p>
          <span class="mode-go">Go to Inbox <rw-icon name="chevron-right" [size]="14" /></span>
        </article>
        <article class="mode" (click)="go('compose')">
          <span class="mode-ico co"><rw-icon name="compose" [size]="20" /></span>
          <h3>Compose</h3>
          <p>Author the process visually — no code. Drag steps onto the canvas, configure them, and <b>Publish</b> a version for Operate to run cases against.</p>
          <span class="mode-go">Go to Compose <rw-icon name="chevron-right" [size]="14" /></span>
        </article>
      </div>

      <h2 class="section">Key concepts</h2>
      <div class="concepts">
        @for (c of concepts; track c.term) {
          <div class="concept">
            <span class="concept-ico"><rw-icon [name]="c.icon" [size]="18" /></span>
            <div>
              <div class="term">{{ c.term }}</div>
              <div class="def">{{ c.def }}</div>
            </div>
          </div>
        }
      </div>

      <h2 class="section">Frequently asked</h2>
      <div class="faq">
        @for (f of faqs; track f.q; let i = $index) {
          <div class="qa" [class.open]="openIndex() === i">
            <button type="button" class="q" (click)="toggle(i)" [attr.aria-expanded]="openIndex() === i">
              <span>{{ f.q }}</span>
              <rw-icon name="chevron-down" [size]="18" class="caret" />
            </button>
            @if (openIndex() === i) { <p class="a">{{ f.a }}</p> }
          </div>
        }
      </div>

      <footer class="foot">
        <span class="pulse"></span>
        This build runs on an in-memory mock runtime. For onboarding policy questions, contact your PPSO operations lead.
      </footer>
    </div>
  `,
  styles: `
    :host { display: block; }
    .wrap { max-width: 860px; margin: 0 auto; padding: var(--s-32) var(--s-24) 64px; }
    .head h1 { margin: 0; font-family: var(--font-display); font-size: var(--fs-600); font-weight: var(--fw-bold); letter-spacing: -0.02em; }
    .head .sub { margin: var(--s-4) 0 0; color: var(--muted); font-size: var(--fs-300); }

    .banner { display: flex; align-items: center; gap: var(--s-16); margin: var(--s-24) 0 var(--s-32); padding: var(--s-16) var(--s-20); background: linear-gradient(120deg, var(--acn-05), var(--acn-10)); border: 1px solid var(--accent-border); border-radius: var(--radius-lg); }
    .banner-ico { flex: none; display: inline-grid; place-items: center; width: 44px; height: 44px; border-radius: var(--radius); color: #fff; background: linear-gradient(135deg, var(--acn-40), var(--acn-70)); box-shadow: var(--shadow-4); }
    .banner-text { flex: 1; display: flex; flex-direction: column; }
    .banner-text strong { font-size: var(--fs-400); }
    .banner-text span { color: var(--muted); font-size: var(--fs-300); }

    .section { font-size: var(--fs-200); text-transform: uppercase; letter-spacing: 0.06em; color: var(--faint); font-weight: var(--fw-bold); margin: var(--s-24) 0 var(--s-12); }

    .modes { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-12); }
    .mode { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-2); padding: var(--s-20); cursor: pointer; transition: box-shadow 0.12s ease, border-color 0.12s ease; }
    .mode:hover { box-shadow: var(--shadow-8); border-color: var(--border-strong); }
    .mode-ico { display: inline-grid; place-items: center; width: 40px; height: 40px; border-radius: var(--radius); margin-bottom: var(--s-10); }
    .mode-ico.op { background: var(--accent-weak); color: var(--accent); }
    .mode-ico.co { background: var(--info-weak); color: var(--info); }
    .mode h3 { margin: 0 0 var(--s-4); font-size: var(--fs-400); }
    .mode p { margin: 0; color: var(--muted); font-size: var(--fs-300); line-height: 1.5; }
    .mode-go { display: inline-flex; align-items: center; gap: 4px; margin-top: var(--s-12); color: var(--accent); font-size: var(--fs-200); font-weight: var(--fw-semibold); }

    .concepts { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-10); }
    .concept { display: flex; gap: var(--s-12); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: var(--s-12) var(--s-16); }
    .concept-ico { flex: none; display: inline-grid; place-items: center; width: 32px; height: 32px; border-radius: var(--radius); background: var(--accent-weak); color: var(--accent); }
    .concept .term { font-size: var(--fs-300); font-weight: var(--fw-semibold); }
    .concept .def { font-size: var(--fs-200); color: var(--muted); line-height: 1.45; margin-top: 2px; }

    .faq { display: flex; flex-direction: column; gap: var(--s-8); }
    .qa { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
    .qa.open { border-color: var(--accent-border); }
    .q { display: flex; align-items: center; justify-content: space-between; gap: var(--s-12); width: 100%; text-align: left; padding: var(--s-12) var(--s-16); border: none; background: transparent; font: inherit; font-size: var(--fs-300); font-weight: var(--fw-semibold); color: var(--text); cursor: pointer; }
    .q:hover { background: var(--surface-2); }
    .caret { color: var(--faint); transition: transform 0.15s ease; flex: none; }
    .qa.open .caret { transform: rotate(180deg); color: var(--accent); }
    .a { margin: 0; padding: 0 var(--s-16) var(--s-16); color: var(--muted); font-size: var(--fs-300); line-height: 1.55; }

    .foot { display: flex; align-items: center; gap: var(--s-8); margin-top: var(--s-32); padding-top: var(--s-16); border-top: 1px solid var(--border); color: var(--faint); font-size: var(--fs-200); }
    .pulse { flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--ok); box-shadow: 0 0 0 3px var(--ok-weak); }

    .btn { display: inline-flex; align-items: center; gap: var(--s-6); padding: var(--s-8) var(--s-16); border: 1px solid transparent; border-radius: var(--radius-sm); font: inherit; font-size: var(--fs-300); font-weight: var(--fw-semibold); cursor: pointer; }
    .btn.primary { background: var(--brand); color: #fff; }
    .btn.primary:hover { background: var(--brand-hover); }

    @media (max-width: 720px) { .modes, .concepts { grid-template-columns: 1fr; } }
  `,
})
export class HelpComponent {
  readonly tour = inject(TourService);
  readonly #shell = inject(ShellService);
  readonly concepts = CONCEPTS;
  readonly faqs = FAQS;
  readonly openIndex = signal<number | null>(0);

  toggle(i: number): void {
    this.openIndex.update((cur) => (cur === i ? null : i));
  }
  go(view: 'inbox' | 'compose'): void {
    this.#shell.show(view);
  }
}
