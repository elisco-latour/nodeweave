import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection, provideAppInitializer, inject } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { provideAuth, SessionService } from './app/core/auth';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
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
    // HTTP for the BFF: send the session cookie, add the anti-CSRF header, handle 401.
    provideHttpClient(
      withInterceptors([authInterceptor]),
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
    ),
    // Auth: bind the session gateway, then resolve the session before routing.
    ...provideAuth(),
    provideAppInitializer(() => inject(SessionService).load()),
    // Feature composition root — bind ports to their implementations here.
    ...provideActionsFeature(),
    ...provideCasesFeature(),
    ...provideOverviewFeature(),
    ...provideProcessesFeature(),
    ...provideNotificationsFeature(),
    ...provideSettingsFeature(),
  ],
}).catch((err) => console.error(err));
