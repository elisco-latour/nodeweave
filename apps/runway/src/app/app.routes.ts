import type { Routes } from '@angular/router';
import { OverviewPageComponent, OverviewViewModel } from './features/overview';
import { InboxPageComponent, ActionDetailPageComponent, InboxViewModel } from './features/actions';
import { CasesPageComponent, CaseDetailPageComponent } from './features/cases';
import { ComposePageComponent, ComposeViewModel } from './features/processes';
import { HelpComponent } from './shell/help.component';
import { SettingsPageComponent, SettingsViewModel } from './features/settings';
import { authGuard, WelcomeComponent } from './core/auth';

/**
 * App routes.
 * - `/welcome` is the (unguarded) sign-in screen; every app route is behind authGuard.
 * - Home is the overview dashboard (default landing).
 * - Inbox is master-detail: the list stays, `:actionId` fills the reading pane.
 * - Cases is a table registry; `cases/:ref` is a standalone detail page.
 */
export const routes: Routes = [
  { path: 'welcome', component: WelcomeComponent, title: 'Sign in — Runway' },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: OverviewPageComponent, title: 'Overview — Runway', canActivate: [authGuard], providers: [OverviewViewModel] },
  {
    path: 'inbox',
    component: InboxPageComponent,
    title: 'Inbox — Runway',
    canActivate: [authGuard],
    providers: [InboxViewModel], // shared by the list page and the reading pane
    children: [
      { path: ':actionId', component: ActionDetailPageComponent, title: 'Action — Runway' },
    ],
  },
  { path: 'cases', component: CasesPageComponent, title: 'Cases — Runway', canActivate: [authGuard] },
  { path: 'cases/:ref', component: CaseDetailPageComponent, title: 'Case — Runway', canActivate: [authGuard] },
  { path: 'compose', component: ComposePageComponent, title: 'Compose — Runway', canActivate: [authGuard], providers: [ComposeViewModel] },
  { path: 'help', component: HelpComponent, title: 'Help — Runway', canActivate: [authGuard] },
  { path: 'settings', component: SettingsPageComponent, title: 'Settings — Runway', canActivate: [authGuard], providers: [SettingsViewModel] },
  { path: '**', redirectTo: 'home' },
];
