import { Component, ChangeDetectionStrategy, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RuntimeService } from '../runtime/runtime.service';
import { CaseDetailComponent } from './case-detail.component';
import { IconComponent } from '../shared/icon.component';

/**
 * Routed case detail (/cases/:ref). `ref` is bound from the route param
 * (withComponentInputBinding). A standalone page with a breadcrumb back to the
 * cases table.
 */
@Component({
  selector: 'rw-case-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CaseDetailComponent, IconComponent, RouterLink],
  template: `
    @if (record(); as rec) {
      <div class="page">
        <a class="crumb" routerLink="/cases"><rw-icon name="chevron-right" [size]="15" class="flip" />All cases</a>
        <rw-case-detail [rec]="rec" />
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
  readonly #rt = inject(RuntimeService);
  readonly record = computed(() => this.#rt.caseByRef(this.ref()));
}
