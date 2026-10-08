import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CatalogApiService } from './catalog-api.service';

describe('CatalogApiService', () => {
  let api: CatalogApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    // Tests only: inside the container the client is the container's.
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(CatalogApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('searches on the relative path, always with limit=20 and the page', () => {
    api.search({}, 2).subscribe();
    const req = http.expectOne((r) => r.url === '/api/v1/propiedades');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().sort()).toEqual(['limit', 'page']);
    expect(req.request.params.get('limit')).toBe('20');
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ data: [], meta: { page: 2, limit: 20, total: 0, totalPages: 0 } });
  });

  it('sends only the filters that have a value', () => {
    api.search({ ciudad: '', fechaInicio: '2026-11-01', fechaFin: '2026-11-04', huespedes: undefined }, 1).subscribe();
    const req = http.expectOne((r) => r.url === '/api/v1/propiedades');
    expect(req.request.params.keys().sort()).toEqual(['fechaFin', 'fechaInicio', 'limit', 'page']);
    expect(req.request.params.get('fechaInicio')).toBe('2026-11-01');
    req.flush({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  });

  it('sends every filter when all of them have a value, the city without surrounding spaces', () => {
    api.search({ ciudad: ' Bogotá ', fechaInicio: '2026-11-01', fechaFin: '2026-11-04', huespedes: 3 }, 1).subscribe();
    const req = http.expectOne((r) => r.url === '/api/v1/propiedades');
    expect(req.request.params.get('ciudad')).toBe('Bogotá');
    expect(req.request.params.get('huespedes')).toBe('3');
    req.flush({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
  });

  it('gets one property on /api/v1/propiedades/{id}', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    api.get(id).subscribe();
    const req = http.expectOne(`/api/v1/propiedades/${id}`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('encodes an id that is not a plain UUID, so the API answers 400 instead of another route', () => {
    api.get('a/b').subscribe();
    http.expectOne('/api/v1/propiedades/a%2Fb').flush({});
  });
});
