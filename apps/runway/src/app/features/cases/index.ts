/**
 * Public API of the cases feature slice. Cross-feature/app code imports only
 * from here — never from the slice internals (ports, use cases, infrastructure).
 */
export { Case } from './domain/case.entity';
export { CasesViewModel } from './state/cases.view-model';
export { CaseDetailViewModel } from './state/case-detail.view-model';
export { CasesPageComponent } from './ui/pages/cases-page.component';
export { CaseDetailPageComponent } from './ui/pages/case-detail-page.component';
export { provideCasesFeature } from './cases.providers';

/**
 * Transitional: the Overview dashboard (not yet migrated) reuses the case
 * filter classification. Remove this export once the overview slice consumes
 * case stats through its own ViewModel/use case.
 */
export { matchesFilter, type CaseFilterId } from './application/queries/case-query';
