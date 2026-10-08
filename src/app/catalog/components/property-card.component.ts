import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatCents } from '../model/money';
import { PropiedadSummary } from '../model/propiedad';

/** Property Card (design-system.md): the whole card is one link to the detail. */
@Component({
  selector: 'app-property-card',
  imports: [RouterLink],
  template: `
    @let p = propiedad();
    <a [routerLink]="['/propiedades', p.id]">
      @if (p.fotoPrincipal) {
        <img class="photo" [src]="p.fotoPrincipal" [alt]="p.titulo" loading="lazy" />
      } @else {
        <div class="photo" aria-hidden="true"></div>
      }
      <div class="body">
        <h2>{{ p.titulo }}</h2>
        <p class="place">{{ p.ciudad }}, {{ p.pais }}</p>
        <p class="price"><strong>{{ price() }}</strong>/noche</p>
        @if (p.calificacion !== undefined) {
          <p class="rating" [attr.aria-label]="'Calificación ' + rating()">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9z"/></svg>
            {{ rating() }}
          </p>
        }
      </div>
    </a>
  `,
  styles: `
    a {
      display: flex; flex-direction: column; height: 100%; overflow: hidden; color: inherit;
      text-decoration: none; background: var(--color-bg-card); border-radius: var(--radius-lg);
      box-shadow: var(--shadow-md);
    }
    .photo { display: block; width: 100%; aspect-ratio: 16 / 10; object-fit: cover; background: var(--color-primary-100); }
    .body {
      display: grid; grid-template-columns: 1fr auto; align-items: end;
      gap: var(--space-1) var(--space-2); padding: var(--space-3) var(--space-4) var(--space-4);
    }
    h2, .place { grid-column: 1 / -1; }
    h2 { margin: 0; font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); line-height: var(--line-height-tight); }
    p { margin: 0; }
    .place { color: var(--color-text-secondary); font-size: var(--font-size-sm); }
    .price { font-size: var(--font-size-sm); }
    .rating { display: flex; align-items: center; gap: var(--space-1); color: var(--color-text-secondary); }
    svg { width: var(--space-4); height: var(--space-4); fill: none; stroke: var(--color-secondary-500); stroke-width: 1.5; }
  `,
})
export class PropertyCardComponent {
  readonly propiedad = input.required<PropiedadSummary>();

  price(): string {
    return formatCents(this.propiedad().precioNocheCents, this.propiedad().moneda);
  }

  /** "4,9": the decimal comma, as in the prices. */
  rating(): string {
    return String(this.propiedad().calificacion).replace('.', ',');
  }
}
