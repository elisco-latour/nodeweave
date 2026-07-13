/**
 * Public API of the processes (Compose) feature slice. Cross-feature/app code
 * imports only from here — never from the slice internals (ports, use cases,
 * infrastructure).
 */
export { Process } from './domain/process.entity';
export { ComposeViewModel } from './state/compose.view-model';
export { ComposePageComponent } from './ui/pages/compose-page.component';
export { provideProcessesFeature } from './processes.providers';

/** The read-only case process map — consumed by the cases detail view. */
export { ProcessMapComponent } from './ui/process-map.component';
