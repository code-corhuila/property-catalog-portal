import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PropiedadSummary } from '../model/propiedad';
import { PropertyCardComponent } from './property-card.component';

const VILLA: PropiedadSummary = {
  id: '550e8400-e29b-41d4-a716-446655440000', titulo: 'Apartamento en Villa Del Mar', ciudad: 'Cartagena',
  pais: 'Colombia', precioNocheCents: 50000000, moneda: 'COP', calificacion: 4.9, fotoPrincipal: 'http://localhost:8080/dev/fotos/1.svg',
};

describe('PropertyCardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), provideRouter([])] });
  });

  async function render(propiedad: PropiedadSummary): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(PropertyCardComponent);
    fixture.componentRef.setInput('propiedad', propiedad);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('shows the photo, the title, the place, the price per night and the rating', async () => {
    const card = await render(VILLA);
    const img = card.querySelector('img')!;
    expect(img.getAttribute('src')).toBe(VILLA.fotoPrincipal);
    expect(img.getAttribute('alt')).toBe('Apartamento en Villa Del Mar');
    expect(card.querySelector('h2')?.textContent?.trim()).toBe('Apartamento en Villa Del Mar');
    expect(card.textContent).toContain('Cartagena, Colombia');
    expect(card.querySelector('.price')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('$500.000 COP/noche');
    expect(card.querySelector('.rating')?.textContent?.trim()).toBe('4,9');
  });

  it('is one link to the detail of the property', async () => {
    const links = (await render(VILLA)).querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe(`/propiedades/${VILLA.id}`);
  });

  it('shows a coloured box instead of the photo, and no star, when they are missing', async () => {
    const { fotoPrincipal, calificacion, ...bare } = VILLA;
    const card = await render(bare);
    expect(card.querySelector('img')).toBeNull();
    expect(card.querySelector('.photo')).not.toBeNull();
    expect(card.querySelector('.rating')).toBeNull();
  });
});
