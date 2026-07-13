import { Component, ChangeDetectionStrategy, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GovernanceService } from '../../../../core/governance/governance.service';
import { IconComponent } from '../../../../shared/icon.component';
import { ErrorBannerComponent } from '../../../../shared/ui/error-banner.component';
import { LoadingStateComponent } from '../../../../shared/ui/loading-state.component';
import { CaseDetailViewModel } from '../../state/case-detail.view-model';
import { CaseDetailComponent } from '../components/case-detail.component';

/**
 * Routed case detail (/cases/:ref). `ref` is bound from the route param
 * (withComponentInputBinding); an effect loads it into the ViewModel. Smart
 * page: provides the CaseDetailViewModel shared with the readiness view. PII
 * masking goes through the GovernanceService.
 */
@Component({
  selector: 'rw-case-detail-page',
  imports: [CaseDetailComponent, IconComponent, RouterLink, ErrorBannerComponent, LoadingStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CaseDetailViewModel],
  template: `
    @if (vm.case(); as rec) {
      <div class="page">
        <a class="crumb" routerLink="/cases"><rw-icon name="chevron-right" [size]="15" class="flip" />All cases</a>
        <rw-case-detail [case]="rec" [events]="vm.events()" [joinerName]="joinerName()" />
      </div>
    } @else if (vm.isLoading()) {
      <rw-loading label="Loading case…" />
    } @else if (vm.error()) {
      <div class="page">
        <a class="crumb" routerLink="/cases"><rw-icon name="chevron-right" [size]="15" class="flip" />All cases</a>
        <rw-error-banner [message]="vm.error()!" [showRetry]="true" [showDismiss]="false" (retry)="vm.load(ref())" />
      </div>
    } @else {
      <div class="missing">
        <rw-icon name="error-circle" [size]="30" />
        <p>Case <b>{{ ref() }}</b> was not found.</p>
        <a routerLink="/cases">Back to cases</a>
      </div>
    }
  `,
  styles: `
    :host { display: block; height: 100%; min-height: 0; }
    .page { display: flex; flex-direction: column; height: 100%; min-height: 0; background: var(--surface); }
    .crumb { flex: none; display: inline-flex; align-items: center; gap: 4px; padding: var(--s-8) var(--s-24); font-size: var(--fs-200); font-weight: var(--fw-semibold); color: var(--accent); text-decoration: none; border-bottom: 1px solid var(--border); }
    .crumb:hover { background: var(--surface-2); }
    .crumb .flip { transform: rotate(180deg); }
    rw-case-detail { flex: 1; min-height: 0; }
    .missing { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--s-12); color: var(--muted); background: var(--surface); }
    .missing rw-icon { color: var(--idle); }
    .missing p { margin: 0; }
    .missing a { color: var(--accent); font-weight: var(--fw-semibold); }
  `,
})
export class CaseDetailPageComponent {
  readonly ref = input.required<string>();
  readonly vm = inject(CaseDetailViewModel);
  readonly #gov = inject(GovernanceService);

  readonly joinerName = computed(() => {
    const c = this.vm.case();
    return c ? this.#gov.mask(c.joinerName) : '';
  });

  constructor() {
    effect(() => { void this.vm.load(this.ref()); });
  }
}
