import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { ThemeService, type ThemePref } from './theme.service';
import { ConfigService } from './config.service';
import { RuntimeService } from '../runtime/runtime.service';
import { IconComponent, type IconName } from '../shared/icon.component';
import { READINESS_FIELD_DICTIONARY, CLASSIFICATION_LABEL, type Classification } from '../domain/data-dictionary';
import type { Pathway } from '../domain/model';

type IntegStatus = 'connected' | 'assisted' | 'off';
interface Integration { name: string; desc: string; status: IntegStatus; icon: IconName; }

const THEMES: { id: ThemePref; label: string; icon: IconName }[] = [
  { id: 'light', label: 'Light', icon: 'eye' },
  { id: 'dark', label: 'Dark', icon: 'eye-off' },
  { id: 'system', label: 'System', icon: 'settings' },
];
const PATHWAYS: { id: Pathway; label: string }[] = [
  { id: 'centre-level', label: 'Centre-level' },
  { id: 'project-level', label: 'Project-level' },
];
const INTEGRATIONS: Integration[] = [
  { name: 'Microsoft Graph', desc: 'Teams membership, M365 groups, Outlook mail', status: 'connected', icon: 'mail' },
  { name: 'IAM / Directory', desc: 'Accounts, licences, mailing lists', status: 'connected', icon: 'person' },
  { name: 'AssetHub', desc: 'Laptop & equipment provisioning', status: 'connected', icon: 'flash' },
  { name: 'CDP RORO', desc: 'No API — agent prepares, a human executes', status: 'assisted', icon: 'bot' },
  { name: 'MyTE', desc: 'WBS access — agent prepares, a human executes', status: 'assisted', icon: 'bot' },
  { name: 'SharePoint', desc: 'Resource-list writes (output only)', status: 'off', icon: 'cases' },
];
const CLASS_TONE: Record<Classification, string> = { public: 'idle', internal: 'info', confidential: 'warn', personal: 'danger' };
const INTEG_LABEL: Record<IntegStatus, string> = { connected: 'Connected', assisted: 'Human-assisted', off: 'Not configured' };

/** Settings — Appearance (theme), Governance & data, Process configuration, Integrations. */
@Component({
  selector: 'rw-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="wrap">
      <header class="head">
        <h1>Settings</h1>
        <p class="sub">Appearance, governance, process configuration, and connected systems.</p>
      </header>

      <!-- Appearance -->
      <section class="card">
        <div class="c-head"><rw-icon name="eye" [size]="18" /><div><h2>Appearance</h2><p>How Runway looks on this device.</p></div></div>
        <div class="row">
          <div class="r-label"><span class="r-title">Theme</span><span class="r-desc">Light, dark, or follow your system.</span></div>
          <div class="seg">
            @for (t of themes; track t.id) {
              <button type="button" [class.on]="theme.pref() === t.id" (click)="theme.set(t.id)"><rw-icon [name]="t.icon" [size]="15" />{{ t.label }}</button>
            }
          </div>
        </div>
      </section>

      <!-- Governance & data -->
      <section class="card">
        <div class="c-head"><rw-icon name="alert" [size]="18" /><div><h2>Governance &amp; data</h2><p>Classification, PII protection, and retention.</p></div></div>
        <div class="row">
          <div class="r-label"><span class="r-title">Reveal personal data (PII)</span><span class="r-desc">Personal fields are masked by default. Revealing is an authorization decision — audited.</span></div>
          <button type="button" class="switch" [class.on]="rt.piiAuthorized()" (click)="rt.togglePii()" role="switch" [attr.aria-checked]="rt.piiAuthorized()"><span class="knob"></span></button>
        </div>
        <div class="row">
          <div class="r-label"><span class="r-title">Event-log retention</span><span class="r-desc">Set by data policy; the append-only log holds PII (names, dates, EIDs).</span></div>
          <select class="select" [value]="retention()" (change)="retention.set($any($event.target).value)">
            <option value="90">90 days</option><option value="180">180 days</option><option value="365">1 year</option><option value="1825">5 years</option>
          </select>
        </div>
        <div class="dict">
          <div class="dict-title">Data dictionary — the readiness record</div>
          <table>
            <thead><tr><th>Field</th><th>Classification</th><th>Ownership</th></tr></thead>
            <tbody>
              @for (f of dictionary; track f.field) {
                <tr>
                  <td class="mono">{{ f.field }}</td>
                  <td><span class="tag" [attr.data-tone]="classTone(f.classification)">{{ classLabel(f.classification) }}</span></td>
                  <td class="own">{{ f.ownership === 'owned' ? 'Owned' : 'Referenced' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <!-- Process configuration -->
      <section class="card">
        <div class="c-head"><rw-icon name="compose" [size]="18" /><div><h2>Process configuration</h2><p>Defaults the workflow engine resolves per pathway — owners, escalation, and SLA timers.</p></div></div>
        <div class="pconfig">
          @for (p of pathways; track p.id) {
            <div class="pcol">
              <div class="pcol-head">{{ p.label }}</div>
              <label class="field"><span>Requester</span><input type="text" [value]="cfg.get(p.id).requester" (input)="set(p.id, 'requester', $event)" /></label>
              <label class="field"><span>Escalation contact</span><input type="text" [value]="cfg.get(p.id).escalation" (input)="set(p.id, 'escalation', $event)" /></label>
              <label class="field"><span>Leads / recipients</span><input type="text" [value]="cfg.get(p.id).leads" (input)="set(p.id, 'leads', $event)" /></label>
              <div class="field2">
                <label class="field"><span>Remind after (h)</span><input type="number" [value]="cfg.get(p.id).remindAfterH" (input)="setNum(p.id, 'remindAfterH', $event)" /></label>
                <label class="field"><span>Escalate after (h)</span><input type="number" [value]="cfg.get(p.id).escalateAfterH" (input)="setNum(p.id, 'escalateAfterH', $event)" /></label>
              </div>
            </div>
          }
        </div>
      </section>

      <!-- Integrations -->
      <section class="card">
        <div class="c-head"><rw-icon name="flash" [size]="18" /><div><h2>Integrations</h2><p>Authoritative systems Runway references — never duplicates.</p></div></div>
        <div class="integs">
          @for (i of integrations; track i.name) {
            <div class="integ">
              <span class="i-ico"><rw-icon [name]="i.icon" [size]="18" /></span>
              <div class="i-body"><span class="i-name">{{ i.name }}</span><span class="i-desc">{{ i.desc }}</span></div>
              <span class="i-status" [attr.data-s]="i.status"><span class="i-dot"></span>{{ integLabel(i.status) }}</span>
            </div>
          }
        </div>
      </section>
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; overflow-y: auto; }
    .wrap { max-width: 820px; margin: 0 auto; padding: var(--s-32) var(--s-24) 64px; }
    .head h1 { margin: 0; font-family: var(--font-display); font-size: var(--fs-600); font-weight: var(--fw-bold); letter-spacing: -0.02em; }
    .head .sub { margin: var(--s-4) 0 var(--s-24); color: var(--muted); font-size: var(--fs-300); }

    .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-2); padding: var(--s-20); margin-bottom: var(--s-16); }
    .c-head { display: flex; gap: var(--s-12); margin-bottom: var(--s-16); }
    .c-head rw-icon { color: var(--accent); flex: none; margin-top: 2px; }
    .c-head h2 { margin: 0; font-size: var(--fs-400); font-weight: var(--fw-bold); }
    .c-head p { margin: 2px 0 0; color: var(--muted); font-size: var(--fs-200); }
    .c-head code { font-family: var(--font-mono); font-size: var(--fs-100); background: var(--surface-3); padding: 1px 4px; border-radius: var(--radius-xs); }

    .row { display: flex; align-items: center; justify-content: space-between; gap: var(--s-16); padding: var(--s-12) 0; border-top: 1px solid var(--border); }
    .r-label { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .r-title { font-size: var(--fs-300); font-weight: var(--fw-semibold); }
    .r-desc { font-size: var(--fs-200); color: var(--muted); }

    .seg { display: inline-flex; background: var(--surface-3); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 2px; flex: none; }
    .seg button { display: inline-flex; align-items: center; gap: var(--s-6); height: 30px; padding: 0 var(--s-12); border: none; background: transparent; color: var(--muted); border-radius: 3px; font: inherit; font-size: var(--fs-200); font-weight: var(--fw-semibold); cursor: pointer; }
    .seg button.on { background: var(--surface); color: var(--accent); box-shadow: var(--shadow-2); }

    .switch { flex: none; position: relative; width: 42px; height: 24px; border-radius: var(--radius-pill); border: none; background: var(--border-strong); cursor: pointer; transition: background 0.15s ease; }
    .switch.on { background: var(--brand); }
    .switch .knob { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: left 0.15s ease; box-shadow: var(--shadow-2); }
    .switch.on .knob { left: 21px; }

    .select { flex: none; height: 32px; padding: 0 var(--s-8); border: 1px solid var(--border-strong); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); font: inherit; font-size: var(--fs-200); font-weight: var(--fw-semibold); cursor: pointer; }

    .dict { margin-top: var(--s-16); }
    .dict-title { font-size: var(--fs-100); text-transform: uppercase; letter-spacing: 0.05em; color: var(--faint); font-weight: var(--fw-bold); margin-bottom: var(--s-8); }
    .dict table { width: 100%; border-collapse: collapse; font-size: var(--fs-200); }
    .dict th { text-align: left; font-size: var(--fs-100); text-transform: uppercase; letter-spacing: 0.05em; color: var(--faint); font-weight: var(--fw-bold); padding: var(--s-6) var(--s-8); border-bottom: 1px solid var(--border); }
    .dict td { padding: var(--s-6) var(--s-8); border-bottom: 1px solid var(--border); color: var(--muted); }
    .dict td.mono { font-family: var(--font-mono); color: var(--text); }
    .dict td.own { color: var(--muted); }
    .tag { display: inline-block; font-size: var(--fs-100); font-weight: var(--fw-bold); padding: 1px 8px; border-radius: var(--radius-pill); background: var(--tone-weak); color: var(--tone-strong); }
    .tag[data-tone="idle"]   { --tone-weak: var(--idle-weak);   --tone-strong: var(--muted); }
    .tag[data-tone="info"]   { --tone-weak: var(--info-weak);   --tone-strong: var(--info); }
    .tag[data-tone="warn"]   { --tone-weak: var(--warn-weak);   --tone-strong: var(--warn); }
    .tag[data-tone="danger"] { --tone-weak: var(--danger-weak); --tone-strong: var(--danger); }

    .pconfig { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-16); }
    .pcol { border: 1px solid var(--border); border-radius: var(--radius); padding: var(--s-12); background: var(--surface-2); }
    .pcol-head { font-size: var(--fs-200); font-weight: var(--fw-bold); color: var(--accent); margin-bottom: var(--s-10); }
    .field { display: flex; flex-direction: column; gap: 3px; margin-bottom: var(--s-8); }
    .field span { font-size: var(--fs-100); text-transform: uppercase; letter-spacing: 0.04em; color: var(--faint); font-weight: var(--fw-bold); }
    .field input { height: 30px; padding: 0 var(--s-8); border: 1px solid var(--border-strong); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); font: inherit; font-size: var(--fs-200); }
    .field input:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px var(--accent-weak-2); }
    .field2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-8); }

    .integs { display: grid; grid-template-columns: 1fr 1fr; gap: var(--s-10); }
    .integ { display: flex; align-items: center; gap: var(--s-10); padding: var(--s-12); border: 1px solid var(--border); border-radius: var(--radius); }
    .i-ico { display: inline-grid; place-items: center; width: 34px; height: 34px; flex: none; border-radius: var(--radius); background: var(--surface-3); color: var(--muted); }
    .i-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .i-name { font-size: var(--fs-300); font-weight: var(--fw-semibold); }
    .i-desc { font-size: var(--fs-100); color: var(--muted); }
    .i-status { display: inline-flex; align-items: center; gap: var(--s-6); font-size: var(--fs-100); font-weight: var(--fw-bold); white-space: nowrap; }
    .i-dot { width: 7px; height: 7px; border-radius: 50%; }
    .i-status[data-s="connected"] { color: var(--ok); } .i-status[data-s="connected"] .i-dot { background: var(--ok); }
    .i-status[data-s="assisted"] { color: var(--info); } .i-status[data-s="assisted"] .i-dot { background: var(--info); }
    .i-status[data-s="off"] { color: var(--faint); } .i-status[data-s="off"] .i-dot { background: var(--idle); }

    @media (max-width: 720px) { .pconfig, .integs { grid-template-columns: 1fr; } }
  `,
})
export class SettingsComponent {
  readonly theme = inject(ThemeService);
  readonly cfg = inject(ConfigService);
  readonly rt = inject(RuntimeService);
  readonly themes = THEMES;
  readonly pathways = PATHWAYS;
  readonly integrations = INTEGRATIONS;
  readonly dictionary = READINESS_FIELD_DICTIONARY;
  readonly retention = signal('365');

  classLabel(c: Classification): string { return CLASSIFICATION_LABEL[c]; }
  classTone(c: Classification): string { return CLASS_TONE[c]; }
  integLabel(s: IntegStatus): string { return INTEG_LABEL[s]; }

  set(p: Pathway, key: 'requester' | 'escalation' | 'leads', ev: Event): void {
    this.cfg.update(p, { [key]: (ev.target as HTMLInputElement).value });
  }
  setNum(p: Pathway, key: 'remindAfterH' | 'escalateAfterH', ev: Event): void {
    this.cfg.update(p, { [key]: Number((ev.target as HTMLInputElement).value) || 0 });
  }
}
