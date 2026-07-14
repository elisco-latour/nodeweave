import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';
import { SessionService } from './session.service';

/**
 * Sign-in screen (route: /welcome, unguarded). "Sign in" begins the session —
 * on the BFF this is a full-page redirect to Accenture SSO; on the mock it
 * authenticates in place and returns to where you were headed.
 */
@Component({
  selector: 'rw-welcome',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stage">
      <div class="card">
        <div class="brand">
          <span class="mark"><rw-icon name="brand" [size]="26" /></span>
          <span class="name">Runway</span>
        </div>
        <h1>Onboarding readiness, orchestrated</h1>
        <p class="sub">Sign in with your Accenture account to continue.</p>
        <button type="button" class="btn" (click)="signIn()" [disabled]="signingIn()">
          <rw-icon name="person" [size]="18" />
          {{ signingIn() ? 'Signing in…' : 'Sign in with Accenture' }}
        </button>
        <p class="fine"><rw-icon name="alert" [size]="13" />Your information is secure and private.</p>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .stage { height: 100%; display: grid; place-items: center; padding: var(--s-24);
      background: linear-gradient(135deg, var(--acn-95) 0%, var(--acn-80) 55%, var(--acn-60) 100%); }
    .card { width: min(420px, 100%); background: var(--surface); border-radius: var(--radius-xl); box-shadow: var(--shadow-28);
      padding: var(--s-32) var(--s-32) var(--s-24); text-align: center; }
    .brand { display: inline-flex; align-items: center; gap: var(--s-8); margin-bottom: var(--s-24); }
    .mark { display: inline-grid; place-items: center; width: 40px; height: 40px; border-radius: var(--radius-lg);
      color: #fff; background: linear-gradient(135deg, var(--acn-40), var(--acn-70)); box-shadow: var(--shadow-8); }
    .name { font-family: var(--font-display); font-weight: var(--fw-bold); font-size: var(--fs-500); letter-spacing: -0.01em; }
    h1 { margin: 0; font-family: var(--font-display); font-size: var(--fs-500); font-weight: var(--fw-bold); letter-spacing: -0.02em; }
    .sub { margin: var(--s-8) 0 var(--s-24); color: var(--muted); font-size: var(--fs-300); }
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--s-8); width: 100%; height: 44px;
      border: none; border-radius: var(--radius-sm); background: var(--brand); color: #fff; font: inherit;
      font-size: var(--fs-400); font-weight: var(--fw-semibold); cursor: pointer; transition: background 0.1s ease; }
    .btn:hover:not(:disabled) { background: var(--brand-hover); }
    .btn:disabled { opacity: 0.7; cursor: default; }
    .fine { display: inline-flex; align-items: center; gap: var(--s-6); margin: var(--s-16) 0 0; color: var(--faint); font-size: var(--fs-100); }
  `,
})
export class WelcomeComponent {
  readonly #session = inject(SessionService);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly signingIn = signal(false);

  constructor() {
    if (this.#session.isAuthenticated()) {
      this.#router.navigateByUrl('/home');
    }
  }

  signIn(): void {
    this.signingIn.set(true);
    const returnUrl = this.#route.snapshot.queryParamMap.get('returnUrl') || '/home';
    void this.#session.login(returnUrl);
  }
}
