import type { Routes } from '@angular/router';
import { HomeComponent } from './operate/home.component';
import { InboxComponent } from './operate/inbox.component';
import { ActionDetailComponent } from './operate/action-detail.component';
import { CasesComponent } from './operate/cases.component';
import { CaseDetailPageComponent } from './operate/case-detail-page.component';
import { ComposeComponent } from './compose/compose.component';
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
  { path: 'home', component: HomeComponent, title: 'Overview — Runway' },
  {
    path: 'inbox',
    component: InboxComponent,
    title: 'Inbox — Runway',
    children: [
      { path: ':actionId', component: ActionDetailComponent, title: 'Action — Runway' },
    ],
  },
  { path: 'cases', component: CasesComponent, title: 'Cases — Runway' },
  { path: 'cases/:ref', component: CaseDetailPageComponent, title: 'Case — Runway' },
  { path: 'compose', component: ComposeComponent, title: 'Compose — Runway' },
  { path: 'help', component: HelpComponent, title: 'Help — Runway' },
  { path: 'settings', component: SettingsComponent, title: 'Settings — Runway' },
  { path: '**', redirectTo: 'home' },
];
