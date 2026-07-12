import type { Routes } from '@angular/router';
import { InboxComponent } from './operate/inbox.component';
import { CasesComponent } from './operate/cases.component';
import { CaseDetailPageComponent } from './operate/case-detail-page.component';
import { ComposeComponent } from './compose/compose.component';
import { HelpComponent } from './shell/help.component';

/** App routes. Cases nests the detail as a child so it deep-links (/cases/:ref) yet can render inside master-detail. */
export const routes: Routes = [
  { path: '', redirectTo: 'inbox', pathMatch: 'full' },
  { path: 'inbox', component: InboxComponent, title: 'Inbox — Runway' },
  {
    path: 'cases',
    component: CasesComponent,
    title: 'Cases — Runway',
    children: [
      { path: ':ref', component: CaseDetailPageComponent, title: 'Case — Runway' },
    ],
  },
  { path: 'compose', component: ComposeComponent, title: 'Compose — Runway' },
  { path: 'help', component: HelpComponent, title: 'Help — Runway' },
  { path: '**', redirectTo: 'inbox' },
];
