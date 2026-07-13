import { Injectable, inject, signal } from '@angular/core';
import { ShellService, type View } from './shell.service';
import type { IconName } from '../shared/icon.component';
import { loadJson, saveJson } from '../runtime/persist';

export interface TourStep {
  icon: IconName;
  eyebrow: string;
  title: string;
  body: string;
  view: View; // the surface shown behind the modal for this step
}

export const TOUR_STEPS: TourStep[] = [
  {
    icon: 'brand', eyebrow: 'Welcome', view: 'home',
    title: 'Welcome to Runway',
    body: 'Onboarding readiness, orchestrated. Runway tracks every joiner’s path to Day 1 in one place — an agent does the work, and you supervise. Here’s the two-minute tour.',
  },
  {
    icon: 'home', eyebrow: 'Overview', view: 'home',
    title: 'See readiness at a glance',
    body: 'Your landing page. Open actions, cases at risk, work in progress, and who’s ready for Day 1 — with overall readiness and the cases that need attention or are starting soon, each a click away.',
  },
  {
    icon: 'inbox', eyebrow: 'Supervise', view: 'inbox',
    title: 'Act from your Inbox',
    body: 'Only what needs a person lands here — decisions, approvals, and human tasks, each with the reason, the impact, and a recommended next step. Everything else, the agent is already handling.',
  },
  {
    icon: 'cases', eyebrow: 'Track', view: 'cases',
    title: 'Follow readiness on every case',
    body: 'Open a case to see its readiness items, blockers, owners, a live process map, and the full activity trail. Personal data stays masked until an authorized viewer reveals it.',
  },
  {
    icon: 'compose', eyebrow: 'Author', view: 'compose',
    title: 'Compose the process, no code',
    body: 'Drag steps onto the canvas and publish a version. Operate then runs each case against your published process — the map lights up live with each case’s state.',
  },
];

const SEEN_KEY = 'tourSeen';

/** Drives the first-run guided tour. Auto-opens once, then remembers it was seen. Replayable from Help. */
@Injectable({ providedIn: 'root' })
export class TourService {
  readonly #shell = inject(ShellService);
  readonly steps = TOUR_STEPS;
  readonly open = signal(false);
  readonly index = signal(0);

  constructor() {
    if (!loadJson<boolean>(SEEN_KEY, false)) {
      // Defer so the app paints before the modal appears.
      queueMicrotask(() => this.start());
    }
  }

  get isFirst(): boolean { return this.index() === 0; }
  get isLast(): boolean { return this.index() === this.steps.length - 1; }

  start(): void {
    this.index.set(0);
    this.open.set(true);
    this.#applyView();
  }

  next(): void {
    if (this.isLast) { this.finish(); return; }
    this.index.update((i) => i + 1);
    this.#applyView();
  }

  prev(): void {
    if (this.isFirst) return;
    this.index.update((i) => i - 1);
    this.#applyView();
  }

  skip(): void { this.finish(); }

  finish(): void {
    this.open.set(false);
    saveJson(SEEN_KEY, true);
    this.#shell.show('home');
  }

  #applyView(): void {
    this.#shell.show(this.steps[this.index()].view);
  }
}
