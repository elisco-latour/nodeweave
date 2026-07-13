/**
 * Public API of the actions (Inbox) feature slice. Cross-feature/app code
 * imports only from here — never from the slice internals (ports, use cases,
 * infrastructure).
 */
export { Action } from './domain/action.entity';
export { InboxViewModel } from './state/inbox.view-model';
export { InboxPageComponent } from './ui/pages/inbox-page.component';
export { ActionDetailPageComponent } from './ui/pages/action-detail-page.component';
export { provideActionsFeature } from './actions.providers';
