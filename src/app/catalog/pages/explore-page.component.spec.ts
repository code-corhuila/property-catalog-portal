import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { ApiError } from '../../shell-contract';
import { CatalogApiService } from '../data/catalog-api.service';
import { Page, PropiedadFilters, PropiedadSummary } from '../model/propiedad';
import { ExplorePageComponent } from './explore-page.component';

const card = (n: number): PropiedadSummary => ({
  id: `550e8400-e29b-41d4-a716-4466554400${String(n).padStart(2, '0')}`, titulo: `Casa ${n}`,
  ciudad: 'Cartagena', pais: 'Colombia', precioNocheCents: 50000000, moneda: 'COP',
});
const page = (n: number, totalPages: number, data = [card(1), card(2)]): Page<PropiedadSummary> =>
  ({ data, meta: { page: n, limit: 20, total: data.length, totalPages } });
const failure: ApiError = {
  status: 500, code: 'INTERNAL_ERROR', message: 'internal server error', details: [], traceId: 'abc',
  userMessage: 'Algo salió mal de nuestro lado. Referencia: abc',
};

describe('ExplorePageComponent', () => {
  let calls: { filters: PropiedadFilters; page: number; answer: Subject<Page<PropiedadSummary>> }[];
  let fixture: ComponentFixture<ExplorePageComponent>;

  beforeEach(async () => {
    calls = [];
    const api = {
      search: (filters: PropiedadFilters, n: number) => {
        const answer = new Subject<Page<PropiedadSummary>>();
        calls.push({ filters, page: n, answer });
        return answer;
      },
    };
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([]), { provide: CatalogApiService, useValue: api }],
    });
    fixture = TestBed.createComponent(ExplorePageComponent);
    await fixture.whenStable();
  });

  const element = (): HTMLElement => fixture.nativeElement;
  const button = (text: string) =>
    Array.from(element().querySelectorAll('button')).find((b) => b.textContent?.trim() === text)!;
  async function answer(value: Page<PropiedadSummary> | ApiError, ok = true): Promise<void> {
    const last = calls[calls.length - 1].answer;
    if (ok) last.next(value as Page<PropiedadSummary>);
    else last.error(value);
    await fixture.whenStable();
  }

  it('has the title "Explorar propiedades"', () => {
    expect(element().querySelector('h1')?.textContent?.trim()).toBe('Explorar propiedades');
  });

  it('shows three grey cards while it loads the first page', () => {
    expect(calls).toHaveLength(1);
    expect(calls[0].page).toBe(1);
    expect(element().querySelectorAll('.skeleton')).toHaveLength(3);
    expect(element().querySelector('app-property-card')).toBeNull();
  });

  it('shows one card per property and the pages', async () => {
    await answer(page(1, 2));
    expect(element().querySelectorAll('.skeleton')).toHaveLength(0);
    expect(element().querySelectorAll('app-property-card')).toHaveLength(2);
    expect(element().querySelector('nav')?.textContent).toContain('Página 1 de 2');
    expect(button('Anterior').disabled).toBe(true);
    expect(button('Siguiente').disabled).toBe(false);
  });

  it('shows the empty state when no property matches', async () => {
    await answer(page(1, 0, []));
    expect(element().textContent).toContain('No encontramos propiedades para esta búsqueda');
    expect(element().querySelector('nav')).toBeNull();
  });

  it('shows the message of the error and asks again with "Reintentar"', async () => {
    await answer(failure, false);
    expect(element().querySelector('[role="alert"]')?.textContent).toContain('Algo salió mal de nuestro lado. Referencia: abc');
    button('Reintentar').click();
    await fixture.whenStable();
    expect(calls).toHaveLength(2);
    expect(calls[1].page).toBe(1);
    await answer(page(1, 1));
    expect(element().querySelectorAll('app-property-card')).toHaveLength(2);
  });

  it('asks for page 2 with "Siguiente", and disables it on the last page', async () => {
    await answer(page(1, 2));
    button('Siguiente').click();
    await fixture.whenStable();
    expect(calls[1].page).toBe(2);
    await answer(page(2, 2));
    expect(element().querySelector('nav')?.textContent).toContain('Página 2 de 2');
    expect(button('Siguiente').disabled).toBe(true);
    button('Anterior').click();
    await fixture.whenStable();
    expect(calls[2].page).toBe(1);
  });
});
