import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Subject } from 'rxjs';
import { ApiError } from '../../shell-contract';
import { PROPERTY_ROUTES } from '../catalog.routes';
import { CatalogApiService } from '../data/catalog-api.service';
import { PropiedadDetail } from '../model/propiedad';

const ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER = '550e8400-e29b-41d4-a716-446655440001';
const foto = (n: number) => `http://localhost:8080/dev/fotos/${n}.svg`;
const VILLA: PropiedadDetail = {
  id: ID, titulo: 'Apartamento en Villa Del Mar', ciudad: 'Cartagena', pais: 'Colombia',
  precioNocheCents: 50000000, moneda: 'COP', calificacion: 4.9, fotoPrincipal: foto(1),
  capacidad: 6, habitaciones: 3, banos: 2, metrosCuadrados: 120, amenities: ['wifi', 'pool', 'parking'],
  fotos: [foto(1), foto(25), foto(49)],
  anfitrion: { id: '7c9e6679-7425-40de-944b-e07fc1f90000', nombre: 'Charith Chavarro', anfitrionDesde: 2021 },
};
const BARE: PropiedadDetail = {
  id: ID, titulo: 'Habitación en La Candelaria', ciudad: 'Bogotá', pais: 'Colombia',
  precioNocheCents: 9000000, moneda: 'COP', capacidad: 1,
};
const apiError = (status: number, userMessage: string): ApiError =>
  ({ status, code: 'X', message: 'the resource does not exist', details: [], traceId: 'abc', userMessage });

describe('PropertyPageComponent', () => {
  let calls: { id: string; answer: Subject<PropiedadDetail> }[];
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    calls = [];
    const api = {
      get: (id: string) => {
        const answer = new Subject<PropiedadDetail>();
        calls.push({ id, answer });
        return answer;
      },
    };
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        // The mount point of the container.
        provideRouter([{ path: 'propiedades/:propiedadId', children: PROPERTY_ROUTES }]),
        { provide: CatalogApiService, useValue: api },
      ],
    });
    harness = await RouterTestingHarness.create(`/propiedades/${ID}`);
  });

  const element = (): HTMLElement => harness.routeNativeElement!;
  const texts = (selector: string) =>
    Array.from(element().querySelectorAll(selector)).map((e) => e.textContent?.replace(/\s+/g, ' ').trim());
  async function answer(value: PropiedadDetail | ApiError, ok = true): Promise<void> {
    const last = calls[calls.length - 1].answer;
    if (ok) last.next(value as PropiedadDetail);
    else last.error(value);
    await harness.fixture.whenStable();
  }

  it('asks for the property of the route and shows the skeleton of the card meanwhile', () => {
    expect(calls.map((c) => c.id)).toEqual([ID]);
    expect(element().querySelector('.skeleton')).not.toBeNull();
    expect(element().querySelector('h1')).toBeNull();
  });

  it('shows the photos, the title, the place, the rating and the price per night', async () => {
    await answer(VILLA);
    expect(element().querySelector('.skeleton')).toBeNull();
    const main = element().querySelector<HTMLImageElement>('img.main')!;
    expect(main.getAttribute('src')).toBe(foto(1));
    expect(main.getAttribute('alt')).toBe('Apartamento en Villa Del Mar');
    expect(element().querySelectorAll('.thumbs img')).toHaveLength(3);
    expect(element().querySelector('h1')?.textContent?.trim()).toBe('Apartamento en Villa Del Mar');
    expect(element().textContent).toContain('Cartagena, Colombia');
    expect(texts('.rating')).toEqual(['4,9']);
    expect(texts('.price')).toEqual(['$500.000 COP/noche']);
  });

  it('changes the large photo with a thumbnail', async () => {
    await answer(VILLA);
    element().querySelectorAll<HTMLButtonElement>('.thumbs button')[1].click();
    await harness.fixture.whenStable();
    expect(element().querySelector('img.main')?.getAttribute('src')).toBe(foto(25));
  });

  it('shows the facts, the host and what the place offers', async () => {
    await answer({ ...VILLA, amenities: ['wifi', 'pool', 'parking', 'jacuzzi'] });
    expect(texts('.facts li')).toEqual(['6 personas', '3 habitaciones', '2 baños', '120 m²']);
    expect(texts('.host .initials')).toEqual(['CC']);
    expect(element().querySelector('.host')?.textContent).toContain('Charith Chavarro');
    expect(element().querySelector('.host')?.textContent).toContain('Anfitrión desde el 2021');
    expect(texts('.amenities li')).toEqual(['Wifi', 'Piscina', 'Parqueadero', 'jacuzzi']);
  });

  it('leaves no gap and no empty text when the optional fields are missing', async () => {
    await answer(BARE);
    expect(element().querySelector('img')).toBeNull();
    expect(element().querySelector('.photo')).not.toBeNull();
    expect(element().querySelector('.thumbs')).toBeNull();
    expect(element().querySelector('.rating')).toBeNull();
    expect(texts('.facts li')).toEqual(['1 persona']);
    expect(element().querySelector('.host')).toBeNull();
    expect(element().querySelector('.amenities')).toBeNull();
    expect(element().textContent).not.toMatch(/undefined|null|NaN/);
    expect(texts('li').every((t) => !!t)).toBe(true);
  });

  it('links "Reservar ahora" to the booking form of the property', async () => {
    await answer(VILLA);
    const link = Array.from(element().querySelectorAll('a')).find((a) => a.textContent?.trim() === 'Reservar ahora');
    expect(link?.getAttribute('href')).toBe(`/propiedades/${ID}/reservar`);
  });

  it.each([
    [404, 'No encontramos lo que buscas. Referencia: abc'],
    [400, 'Algunos datos no son válidos. Revísalos e intenta de nuevo.'],
  ])('shows "No encontramos lo que buscas" with a link to Explorar on a %i', async (status, userMessage) => {
    await answer(apiError(status, userMessage), false);
    expect(element().querySelector('h1')?.textContent?.trim()).toBe('No encontramos lo que buscas');
    expect(element().querySelector('a')?.getAttribute('href')).toBe('/explorar');
    expect(element().querySelector('button')).toBeNull();
  });

  it('shows the message of any other error, and asks again with "Reintentar"', async () => {
    await answer(apiError(503, 'El servicio no está disponible en este momento. Referencia: abc'), false);
    expect(element().querySelector('[role="alert"]')?.textContent).toContain('El servicio no está disponible en este momento. Referencia: abc');
    element().querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    await harness.fixture.whenStable();
    expect(calls.map((c) => c.id)).toEqual([ID, ID]);
    await answer(VILLA);
    expect(element().querySelector('h1')?.textContent?.trim()).toBe('Apartamento en Villa Del Mar');
  });

  it('loads again when the propiedadId of the route changes', async () => {
    await answer(VILLA);
    await harness.navigateByUrl(`/propiedades/${OTHER}`);
    expect(calls.map((c) => c.id)).toEqual([ID, OTHER]);
    expect(element().querySelector('.skeleton')).not.toBeNull();
  });
});
