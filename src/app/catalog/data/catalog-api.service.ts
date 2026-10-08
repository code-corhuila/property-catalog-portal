import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Page, PropiedadDetail, PropiedadFilters, PropiedadSummary } from '../model/propiedad';

/** One page of the search: design-system.md, "Data table / List". */
export const PAGE_SIZE = 20;

/**
 * Typed calls to the catalog endpoints. The injected HttpClient is the CONTAINER's:
 * its interceptor completes the '/api/v1/...' path, attaches the token and the
 * correlation id, applies the time limit and normalises every error.
 */
@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/propiedades';

  /** Sends only the filters that have a value. */
  search(filters: PropiedadFilters, page: number): Observable<Page<PropiedadSummary>> {
    let params = new HttpParams().set('page', page).set('limit', PAGE_SIZE);
    for (const key of ['ciudad', 'fechaInicio', 'fechaFin', 'huespedes'] as const) {
      const value = String(filters[key] ?? '').trim();
      if (value) params = params.set(key, value);
    }
    return this.http.get<Page<PropiedadSummary>>(this.base, { params });
  }

  get(id: string): Observable<PropiedadDetail> {
    return this.http.get<PropiedadDetail>(`${this.base}/${encodeURIComponent(id)}`);
  }
}
