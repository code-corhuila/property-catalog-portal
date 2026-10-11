/**
 * The contract of property-catalog-api (property-docs, 07-api/contracts/openapi/
 * catalog-service.yaml). Field names match the API exactly; optional fields may be absent.
 */
export interface PropiedadSummary {
  id: string;
  titulo: string;
  ciudad: string;
  pais: string;
  precioNocheCents: number; // minor units: never a float
  moneda: string;
  calificacion?: number;
  fotoPrincipal?: string;
}

export interface Anfitrion {
  id?: string;
  nombre?: string;
  anfitrionDesde?: number;
}

export interface PropiedadDetail extends PropiedadSummary {
  capacidad: number;
  habitaciones?: number;
  banos?: number;
  metrosCuadrados?: number;
  amenities?: string[];
  fotos?: string[];
  anfitrion?: Anfitrion;
}

/** The filters of GET /propiedades. The dates are 'yyyy-mm-dd'; both are sent or neither. */
export interface PropiedadFilters {
  ciudad?: string;
  fechaInicio?: string;
  fechaFin?: string;
  huespedes?: number;
}

/** The shared pagination shape: every list of the system answers like this. */
export interface Page<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
