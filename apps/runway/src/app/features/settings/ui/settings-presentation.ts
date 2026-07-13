import type { IconName } from '../../../shared/icon.component';
import type { Classification } from '../../../domain/data-dictionary';
import type { Pathway } from '../../../domain/model';
import type { ThemePreference } from '../domain/appearance';

/** Connected-system status for the Integrations section (display-only). */
export type IntegStatus = 'connected' | 'assisted' | 'off';
export interface Integration { name: string; desc: string; status: IntegStatus; icon: IconName; }

export const THEMES: { id: ThemePreference; label: string; icon: IconName }[] = [
  { id: 'light', label: 'Light', icon: 'eye' },
  { id: 'dark', label: 'Dark', icon: 'eye-off' },
  { id: 'system', label: 'System', icon: 'settings' },
];

export const PATHWAYS: { id: Pathway; label: string }[] = [
  { id: 'centre-level', label: 'Centre-level' },
  { id: 'project-level', label: 'Project-level' },
];

export const INTEGRATIONS: Integration[] = [
  { name: 'Microsoft Graph', desc: 'Teams membership, M365 groups, Outlook mail', status: 'connected', icon: 'mail' },
  { name: 'IAM / Directory', desc: 'Accounts, licences, mailing lists', status: 'connected', icon: 'person' },
  { name: 'AssetHub', desc: 'Laptop & equipment provisioning', status: 'connected', icon: 'flash' },
  { name: 'CDP RORO', desc: 'No API — agent prepares, a human executes', status: 'assisted', icon: 'bot' },
  { name: 'MyTE', desc: 'WBS access — agent prepares, a human executes', status: 'assisted', icon: 'bot' },
  { name: 'SharePoint', desc: 'Resource-list writes (output only)', status: 'off', icon: 'cases' },
];

export const CLASS_TONE: Record<Classification, string> = { public: 'idle', internal: 'info', confidential: 'warn', personal: 'danger' };
export const INTEG_LABEL: Record<IntegStatus, string> = { connected: 'Connected', assisted: 'Human-assisted', off: 'Not configured' };
