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
 * Case classification policy, reused across slices: the overview dashboard's
 * "at risk" bucket goes through the same predicate as the Cases filter, so the
 * two can never disagree.
 */
export { matchesFilter, type CaseFilterId } from './application/queries/case-query';
