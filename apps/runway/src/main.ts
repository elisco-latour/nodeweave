import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { provideActionsFeature } from './app/features/actions';
import { provideCasesFeature } from './app/features/cases';

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
  ],
}).catch((err) => console.error(err));
