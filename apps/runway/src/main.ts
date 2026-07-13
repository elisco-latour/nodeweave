import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { provideActionsFeature } from './app/features/actions';
import { provideCasesFeature } from './app/features/cases';
import { provideOverviewFeature } from './app/features/overview';
import { provideProcessesFeature } from './app/features/processes';
import { provideNotificationsFeature } from './app/features/notifications';
import { provideSettingsFeature } from './app/features/settings';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    // Feature composition root — bind ports to their implementations here.
    ...provideActionsFeature(),
    ...provideCasesFeature(),
    ...provideOverviewFeature(),
    ...provideProcessesFeature(),
    ...provideNotificationsFeature(),
    ...provideSettingsFeature(),
  ],
}).catch((err) => console.error(err));
