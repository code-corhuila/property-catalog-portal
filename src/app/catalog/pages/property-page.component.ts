import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { asApiError } from '../../shell-contract';
import { CatalogApiService } from '../data/catalog-api.service';
import { formatCents } from '../model/money';
import { PropiedadDetail } from '../model/propiedad';

/** The four designed states, plus a property that does not exist. */
type View =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'missing' }
  | { state: 'ready'; propiedad: PropiedadDetail };

/** The documented keys of `amenities`; an unknown one is shown as it comes. */
const AMENITIES: Record<string, string> = { wifi: 'Wifi', pool: 'Piscina', parking: 'Parqueadero' };

/** Property detail (/propiedades/:propiedadId). */
@Component({
  selector: 'app-property-page',
  imports: [RouterLink],
  template: `
    @let v = view();
    <article class="card">
      @switch (v.state) {
        @case ('loading') {
          <div class="skeleton" aria-busy="true" aria-label="Cargando la propiedad">
            <div class="photo"></div><div class="line"></div><div class="line short"></div><div class="line"></div>
          </div>
        }
        @case ('error') {
          <div role="alert"><p>{{ v.message }}</p><button type="button" (click)="load()">Reintentar</button></div>
        }
        @case ('missing') {
          <h1>No encontramos lo que buscas</h1>
          <p>La propiedad no existe. <a routerLink="/explorar">Ir a Explorar</a></p>
        }
        @case ('ready') {
          @let p = v.propiedad;
          @if (photo(); as src) { <img class="main photo" [src]="src" [alt]="p.titulo" /> }
          @else { <div class="photo" aria-hidden="true"></div> }
          @if (photos().length > 1) {
            <ul class="thumbs">
              @for (src of photos(); track src; let i = $index) {
                <li><button type="button" [attr.aria-pressed]="src === photo()" (click)="selected.set(src)">
                  <img [src]="src" [alt]="'Foto ' + (i + 1) + ' de ' + p.titulo" /></button></li>
              }
            </ul>
          }
          <header>
            <h1>{{ p.titulo }}</h1>
            <p class="price"><strong>{{ price(p) }}</strong>/noche</p>
            <p class="place">{{ p.ciudad }}, {{ p.pais }}
              @if (p.calificacion !== undefined) {
                <span class="rating" [attr.aria-label]="'Calificación ' + rating(p.calificacion)">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9z"/></svg>
                  {{ rating(p.calificacion) }}</span>
              }
            </p>
          </header>
          <ul class="facts">
            @for (fact of facts(p); track fact) { <li>{{ fact }}</li> }
          </ul>
          @if (p.anfitrion?.nombre; as nombre) {
            <section class="host" aria-labelledby="host-title">
              <h2 id="host-title">Anfitrión</h2>
              <span class="initials" aria-hidden="true">{{ initials(nombre) }}</span>
              <p><strong>{{ nombre }}</strong>
                @if (p.anfitrion?.anfitrionDesde; as desde) { <br />Anfitrión desde el {{ desde }} }</p>
            </section>
          }
          @if (p.amenities?.length) {
            <section aria-labelledby="amenities-title">
              <h2 id="amenities-title">Qué ofrece este lugar</h2>
              <ul class="amenities">
                @for (key of p.amenities; track key) { <li>{{ amenity(key) }}</li> }
              </ul>
            </section>
          }
          <a class="primary" [routerLink]="['/propiedades', p.id, 'reservar']">Reservar ahora</a>
        }
      }
    </article>
  `,
  styles: `
    .card {
      display: grid; gap: var(--space-4); max-width: calc(var(--space-16) * 14); margin: 0 auto; padding: var(--space-6);
      background: var(--color-bg-card); border-radius: var(--radius-lg); box-shadow: var(--shadow-md);
    }
    .photo { display: block; width: 100%; aspect-ratio: 16 / 7; object-fit: cover; border-radius: var(--radius-lg); background: var(--color-primary-100); }
    .thumbs { display: flex; gap: var(--space-2); overflow-x: auto; }
    .thumbs button { padding: 0; cursor: pointer; background: none; border: solid transparent; border-radius: var(--radius-md); }
    .thumbs button[aria-pressed='true'] { border-color: var(--color-primary-500); }
    .thumbs img { display: block; width: var(--space-16); aspect-ratio: 1; object-fit: cover; border-radius: var(--radius-sm); }
    ul { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-8); margin: 0; padding: 0; list-style: none; }
    p { margin: 0; }
    header { display: grid; grid-template-columns: 1fr auto; gap: var(--space-2) var(--space-4); }
    h1 { margin: 0; font-size: var(--font-size-xl); line-height: var(--line-height-tight); }
    h2 { margin: 0 0 var(--space-2); font-size: var(--font-size-base); font-weight: var(--font-weight-bold); }
    .price { grid-row: 1; grid-column: 2; font-size: var(--font-size-lg); }
    .place { display: flex; flex-wrap: wrap; gap: var(--space-4); color: var(--color-text-secondary); }
    .rating { display: inline-flex; align-items: center; gap: var(--space-1); }
    svg { width: var(--space-4); height: var(--space-4); fill: none; stroke: var(--color-secondary-500); stroke-width: 1.5; }
    .facts { padding: var(--space-3) 0; border-block: solid var(--color-neutral-100); }
    .host {
      display: grid; grid-template-columns: auto 1fr; align-items: center; gap: var(--space-2) var(--space-4);
      padding: var(--space-4); border: solid var(--color-neutral-100); border-radius: var(--radius-lg);
    }
    .host h2 { grid-column: 1 / -1; margin: 0; }
    .initials {
      display: grid; place-items: center; width: var(--space-12); height: var(--space-12); border-radius: var(--radius-full);
      background: var(--color-primary-700); color: var(--color-text-on-dark); font-size: var(--font-size-lg);
    }
    .amenities { display: grid; grid-template-columns: repeat(2, 1fr); color: var(--color-text-secondary); }
    a { color: var(--color-primary-900); font-weight: var(--font-weight-bold); }
    .primary {
      display: block; padding: var(--space-3); text-align: center; text-decoration: none; font-size: var(--font-size-lg);
      color: var(--color-text-on-dark); background: var(--color-primary-500); border-radius: var(--radius-md);
    }
    [role='alert'] { display: grid; justify-items: start; gap: var(--space-4); }
    button { font: inherit; }
    [role='alert'] button {
      padding: var(--space-2) var(--space-6); cursor: pointer; color: var(--color-primary-900);
      background: var(--color-bg-card); border: solid var(--color-primary-900); border-radius: var(--radius-md);
    }
    .skeleton { display: grid; gap: var(--space-3); }
    .skeleton > div { background: var(--color-neutral-100); }
    .skeleton .line { height: var(--font-size-xl); border-radius: var(--radius-sm); }
    .skeleton .short { width: 50%; }
  `,
})
export class PropertyPageComponent {
  private readonly api = inject(CatalogApiService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  private id = '';

  readonly view = signal<View>({ state: 'loading' });
  readonly selected = signal<string | null>(null);

  constructor() {
    // The component is reused when only the propiedadId changes: it loads again.
    inject(ActivatedRoute).paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.id = params.get('propiedadId') ?? '';
      this.load();
    });
  }

  load(): void {
    this.request?.unsubscribe(); // a newer request replaces an older one
    this.view.set({ state: 'loading' });
    this.selected.set(null);
    this.request = this.api.get(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (propiedad) => this.view.set({ state: 'ready', propiedad }),
        error: (err: unknown) => {
          const error = asApiError(err);
          // A 400 here means the id of the address is not valid: it does not exist either.
          const missing = error.status === 404 || error.status === 400;
          this.view.set(missing ? { state: 'missing' } : { state: 'error', message: error.userMessage });
        },
      });
  }

  /** Every photo once, the main one first. */
  photos(): string[] {
    const v = this.view();
    if (v.state !== 'ready') return [];
    const all = [v.propiedad.fotoPrincipal, ...(v.propiedad.fotos ?? [])].filter((src): src is string => !!src);
    return [...new Set(all)];
  }

  photo(): string | null {
    return this.selected() ?? this.photos()[0] ?? null;
  }

  price(p: PropiedadDetail): string {
    return formatCents(p.precioNocheCents, p.moneda);
  }

  /** "4,9": the decimal comma, as in the prices. */
  rating(calificacion: number): string {
    return String(calificacion).replace('.', ',');
  }

  /** "6 personas", then the facts that come: rooms, bathrooms, area. */
  facts(p: PropiedadDetail): string[] {
    const count = (n: number | undefined, one: string, many: string) =>
      n === undefined ? [] : [`${n} ${n === 1 ? one : many}`];
    return [
      ...count(p.capacidad, 'persona', 'personas'),
      ...count(p.habitaciones, 'habitación', 'habitaciones'),
      ...count(p.banos, 'baño', 'baños'),
      ...(p.metrosCuadrados === undefined ? [] : [`${p.metrosCuadrados} m²`]),
    ];
  }

  initials(nombre: string): string {
    return nombre.trim().split(/\s+/).slice(0, 2).map((word) => word[0].toUpperCase()).join('');
  }

  amenity(key: string): string {
    return Object.hasOwn(AMENITIES, key) ? AMENITIES[key] : key;
  }
}
