/**
 * Public API of the overview feature slice. Cross-feature/app code imports only
 * from here — never from the slice internals (ports, use cases, infrastructure).
 */
export { OverviewViewModel } from './state/overview.view-model';
export { OverviewPageComponent } from './ui/pages/overview-page.component';
export { provideOverviewFeature } from './overview.providers';
export type { OverviewSummary } from './domain/overview-summary';
