import type { Routes } from '@angular/router';
import { OverviewPageComponent, OverviewViewModel } from './features/overview';
import { InboxPageComponent, ActionDetailPageComponent, InboxViewModel } from './features/actions';
import { CasesPageComponent, CaseDetailPageComponent } from './features/cases';
import { ComposePageComponent, ComposeViewModel } from './features/processes';
import { HelpComponent } from './shell/help.component';
import { SettingsComponent } from './shell/settings.component';

/**
 * App routes.
 * - Home is the overview dashboard (default landing).
 * - Inbox is master-detail: the list stays, `:actionId` fills the reading pane.
 * - Cases is a table registry; `cases/:ref` is a standalone detail page.
 */
export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: OverviewPageComponent, title: 'Overview — Runway', providers: [OverviewViewModel] },
  {
    path: 'inbox',
    component: InboxPageComponent,
    title: 'Inbox — Runway',
    providers: [InboxViewModel], // shared by the list page and the reading pane
    children: [
      { path: ':actionId', component: ActionDetailPageComponent, title: 'Action — Runway' },
    ],
  },
  { path: 'cases', component: CasesPageComponent, title: 'Cases — Runway' },
  { path: 'cases/:ref', component: CaseDetailPageComponent, title: 'Case — Runway' },
  { path: 'compose', component: ComposePageComponent, title: 'Compose — Runway', providers: [ComposeViewModel] },
  { path: 'help', component: HelpComponent, title: 'Help — Runway' },
  { path: 'settings', component: SettingsComponent, title: 'Settings — Runway' },
  { path: '**', redirectTo: 'home' },
];
