import { Component, DestroyRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { asApiError } from '../../shell-contract';
import { PropertyCardComponent } from '../components/property-card.component';
import { SearchFormComponent } from '../components/search-form.component';
import { CatalogApiService } from '../data/catalog-api.service';
import { Page, PropiedadFilters, PropiedadSummary } from '../model/propiedad';

/** Every view that loads data has four states, and all four are designed. */
type View =
  | { state: 'loading' }
  | { state: 'error'; message: string; retry: boolean }
  | { state: 'empty' }
  | { state: 'ready'; page: Page<PropiedadSummary> };

/** Explore (/explorar): the result of the search, one page at a time. */
@Component({
  selector: 'app-explore-page',
  imports: [PropertyCardComponent, SearchFormComponent],
  template: `
    <section aria-labelledby="explore-title">
      <h1 id="explore-title">Explorar propiedades</h1>
      <app-search-form (search)="onSearch($event)" />

      @let v = view();
      @switch (v.state) {
        @case ('loading') {
          <ul class="grid" aria-busy="true" aria-label="Cargando propiedades">
            @for (n of [1, 2, 3]; track n) {
              <li class="skeleton"><div class="photo"></div><div class="line"></div><div class="line short"></div></li>
            }
          </ul>
        }
        @case ('error') {
          <div class="notice" role="alert">
            <p>{{ v.message }}</p>
            @if (v.retry) { <button type="button" (click)="load()">Reintentar</button> }
          </div>
        }
        @case ('empty') {
          <div class="notice">
            <p>No encontramos propiedades para esta búsqueda</p>
            @if (hasFilters()) { <button type="button" (click)="searchForm().clear()">Limpiar búsqueda</button> }
          </div>
        }
        @case ('ready') {
          <ul class="grid">
            @for (p of v.page.data; track p.id) {
              <li><app-property-card [propiedad]="p" /></li>
            }
          </ul>
          <nav aria-label="Páginas">
            <button type="button" [disabled]="v.page.meta.page <= 1" (click)="go(v.page.meta.page - 1)">Anterior</button>
            <span>Página {{ v.page.meta.page }} de {{ v.page.meta.totalPages }}</span>
            <button type="button" [disabled]="v.page.meta.page >= v.page.meta.totalPages" (click)="go(v.page.meta.page + 1)">Siguiente</button>
          </nav>
        }
      }
    </section>
  `,
  styles: `
    h1 { margin: 0 0 var(--space-6); font-size: var(--font-size-2xl); font-weight: var(--font-weight-bold); }
    .grid {
      display: grid; gap: var(--space-6); margin: 0; padding: 0; list-style: none;
      /* At most three per row, and one on a narrow screen. */
      grid-template-columns: repeat(auto-fill,
        minmax(min(100%, max(calc(var(--space-16) * 4), calc((100% - 2 * var(--space-6)) / 3))), 1fr));
    }
    .skeleton {
      display: grid; gap: var(--space-2); padding-bottom: var(--space-4); overflow: hidden;
      background: var(--color-bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow-md);
    }
    .skeleton > div { background: var(--color-neutral-100); }
    .skeleton .photo { aspect-ratio: 16 / 10; }
    .skeleton .line { height: var(--font-size-lg); margin: 0 var(--space-4); border-radius: var(--radius-sm); }
    .skeleton .short { width: 50%; }
    .notice {
      display: grid; justify-items: start; gap: var(--space-4); padding: var(--space-8);
      background: var(--color-bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow-md);
    }
    .notice p { margin: 0; font-size: var(--font-size-lg); }
    nav { display: flex; align-items: center; justify-content: center; gap: var(--space-4); margin-top: var(--space-8); }
    button {
      padding: var(--space-2) var(--space-6); cursor: pointer; font: inherit;
      color: var(--color-primary-900); background: var(--color-bg-card);
      border: solid var(--color-primary-900); border-radius: var(--radius-md);
    }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
  `,
})
export class ExplorePageComponent {
  private readonly api = inject(CatalogApiService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  readonly searchForm = viewChild.required(SearchFormComponent);

  readonly filters = signal<PropiedadFilters>({});
  readonly page = signal(1);
  readonly view = signal<View>({ state: 'loading' });

  constructor() {
    this.load();
  }

  load(): void {
    this.request?.unsubscribe(); // a newer request replaces an older one
    this.view.set({ state: 'loading' });
    this.request = this.api.search(this.filters(), this.page())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => this.view.set(page.data.length ? { state: 'ready', page } : { state: 'empty' }),
        error: (err: unknown) => {
          const error = asApiError(err);
          // A 400 whose errors belong to the form is fixed there, not retried.
          const placed = error.status === 400 && this.searchForm().showServerErrors(error.details);
          this.view.set({ state: 'error', message: error.userMessage, retry: !placed });
        },
      });
  }

  /** A new search starts again from page 1. */
  onSearch(filters: PropiedadFilters): void {
    this.filters.set(filters);
    this.page.set(1);
    this.load();
  }

  hasFilters(): boolean {
    return Object.keys(this.filters()).length > 0;
  }

  go(page: number): void {
    this.page.set(page);
    this.load();
  }
}
