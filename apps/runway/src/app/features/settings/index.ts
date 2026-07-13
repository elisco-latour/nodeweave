/**
 * Public API of the settings feature slice. Cross-feature/app code imports only
 * from here — never from the slice internals (ports, use cases, infrastructure).
 */
export { SettingsViewModel } from './state/settings.view-model';
export { SettingsPageComponent } from './ui/settings-page.component';
export { provideSettingsFeature } from './settings.providers';
export type { PathwayConfig } from './domain/pathway-config';
export type { ThemePreference } from './domain/appearance';
