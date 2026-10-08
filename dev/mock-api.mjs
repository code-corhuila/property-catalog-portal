// DEVELOPMENT ONLY. A stand-in for property-api-gateway and property-catalog-api, so the
// portal can be seen with data. It is removed when those two services exist. Node only,
// no dependencies, outside src/: it is not compiled and never reaches the image.
//
//   npm run mock    # http://localhost:8080, the port of the gateway in development
//
// It answers the two operations of catalog-service.yaml with the shapes of the contract
// and the single error envelope of _shared.yaml.
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

const PORT = 8080;
const ORIGIN = 'http://localhost:4200';
const BASE = `http://localhost:${PORT}`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const HOSTS = [
  ['Charith Chavarro', 2021], ['Andrés Gómez', 2019], ['Laura Méndez', 2022], ['Camilo Rojas', 2020],
];
const AMENITIES = [['wifi', 'pool', 'parking'], ['wifi'], ['wifi', 'parking'], ['pool'], []];

// titulo, ciudad, price per night in pesos, calificacion, capacidad, habitaciones, banos, m²
const ROWS = [
  ['Apartamento en Villa Del Mar', 'Cartagena', 500000, 4.9, 6, 3, 2, 120],
  ['Casa colonial en el Centro Histórico', 'Cartagena', 850000, 4.8, 8, 4, 3, 210],
  ['Estudio frente a la playa', 'Cartagena', 230000, 4.5, 2, 1, 1, 35],
  ['Apartamento en Bocagrande', 'Cartagena', 410000, 4.6, 4, 2, 2, 80],
  ['Casa con piscina en Manga', 'Cartagena', 1575000, 4.7, 12, 5, 4, 300],
  ['Loft en Getsemaní', 'Cartagena', 320000, 4.4, 3, 1, 1, 50],
  ['Apartamento en Chapinero', 'Bogotá', 260000, 4.6, 4, 2, 1, 70],
  ['Casa en Usaquén', 'Bogotá', 480000, 4.8, 6, 3, 3, 160],
  ['Estudio en el Parque de la 93', 'Bogotá', 210000, 4.3, 2, 1, 1, 32],
  ['Penthouse en la Zona G', 'Bogotá', 950000, 4.9, 5, 3, 3, 190],
  ['Apartamento cerca de Unicentro', 'Bogotá', 180000, 4.2, 3, 1, 1, 45],
  ['Apartamento en El Poblado', 'Medellín', 300000, 4.7, 4, 2, 2, 90],
  ['Casa campestre en Las Palmas', 'Medellín', 720000, 4.8, 10, 5, 4, 280],
  ['Estudio en Laureles', 'Medellín', 190000, 4.5, 2, 1, 1, 30],
  ['Apartamento en Envigado', 'Medellín', 240000, 4.4, 5, 2, 2, 85],
  ['Loft en Provenza', 'Medellín', 350000, 4.6, 2, 1, 1, 55],
  ['Casa en Santa Marta', 'Santa Marta', 500000, 4.9, 6, 3, 2, 140],
  ['Cabaña en Minca', 'Santa Marta', 280000, 4.7, 4, 2, 1, 60],
  ['Apartamento en El Rodadero', 'Santa Marta', 330000, 4.5, 5, 2, 2, 75],
  ['Casa frente al mar en Taganga', 'Santa Marta', 620000, 4.6, 8, 4, 3, 180],
  ['Apartamento en Granada', 'Cali', 220000, 4.4, 4, 2, 1, 65],
  ['Casa en Ciudad Jardín', 'Cali', 560000, 4.7, 7, 4, 3, 200],
  ['Estudio en San Antonio', 'Cali', 160000, 4.3, 2, 1, 1, 28],
];

const two = (n) => String(n).padStart(2, '0');
const photo = (n) => `${BASE}/dev/fotos/${n}.svg`;

const PROPIEDADES = ROWS.map(([titulo, ciudad, pesos, calificacion, capacidad, habitaciones, banos, metrosCuadrados], i) => {
  const [nombre, anfitrionDesde] = HOSTS[i % HOSTS.length];
  return {
    id: `550e8400-e29b-41d4-a716-4466554400${two(i)}`,
    titulo, ciudad, pais: 'Colombia', precioNocheCents: pesos * 100, moneda: 'COP', calificacion,
    fotoPrincipal: photo(i + 1),
    capacidad, habitaciones, banos, metrosCuadrados,
    amenities: AMENITIES[i % AMENITIES.length],
    fotos: i % 2 === 0 ? [photo(i + 1), photo(i + 25), photo(i + 49)] : [photo(i + 1)],
    anfitrion: { id: `7c9e6679-7425-40de-944b-e07fc1f900${two(i)}`, nombre, anfitrionDesde },
  };
});
// The 24th, with only the required fields: the screens must not leave gaps.
PROPIEDADES.push({
  id: '550e8400-e29b-41d4-a716-446655440023', titulo: 'Habitación en La Candelaria', ciudad: 'Bogotá',
  pais: 'Colombia', precioNocheCents: 9000000, moneda: 'COP', capacidad: 1,
});

const SUMMARY = ['id', 'titulo', 'ciudad', 'pais', 'precioNocheCents', 'moneda', 'calificacion', 'fotoPrincipal'];
const summary = (p) => Object.fromEntries(SUMMARY.filter((k) => k in p).map((k) => [k, p[k]]));
const fold = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const isDate = (s) => DATE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);

/** An integer from min to max, or null. */
function int(value, min, max) {
  return /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max ? Number(value) : null;
}

function search(query) {
  const details = [];
  const page = query.has('page') ? int(query.get('page'), 1, Number.MAX_SAFE_INTEGER) : 1;
  if (page === null) details.push({ field: 'page', message: 'must be an integer of at least 1' });
  const limit = query.has('limit') ? int(query.get('limit'), 1, 100) : 20;
  if (limit === null) details.push({ field: 'limit', message: 'must be between 1 and 100' });
  const huespedes = query.has('huespedes') ? int(query.get('huespedes'), 1, 20) : 1;
  if (huespedes === null) details.push({ field: 'huespedes', message: 'must be an integer from 1 to 20' });

  // Dates are validated, not filtered: there are no reservations here.
  const inicio = query.get('fechaInicio');
  const fin = query.get('fechaFin');
  if (inicio !== null && !isDate(inicio)) details.push({ field: 'fechaInicio', message: 'must be a date yyyy-mm-dd' });
  if (fin !== null && !isDate(fin)) details.push({ field: 'fechaFin', message: 'must be a date yyyy-mm-dd' });
  if ((inicio === null) !== (fin === null)) {
    details.push({ field: inicio === null ? 'fechaInicio' : 'fechaFin', message: 'fechaInicio and fechaFin go together' });
  } else if (inicio !== null && isDate(inicio) && isDate(fin) && fin <= inicio) {
    details.push({ field: 'fechaFin', message: 'must be after fechaInicio' });
  }
  if (details.length) return [400, envelope('VALIDATION_ERROR', 'the request has invalid fields', details)];

  const ciudad = query.has('ciudad') ? fold(query.get('ciudad')) : null;
  const found = PROPIEDADES.filter((p) => (ciudad === null || fold(p.ciudad) === ciudad) && p.capacidad >= huespedes);
  const data = found.slice((page - 1) * limit, page * limit).map(summary);
  return [200, { data, meta: { page, limit, total: found.length, totalPages: Math.ceil(found.length / limit) } }];
}

function detail(id) {
  if (!UUID.test(id)) {
    return [400, envelope('VALIDATION_ERROR', 'the request has invalid fields', [{ field: 'id', message: 'must be a UUID' }])];
  }
  const found = PROPIEDADES.find((p) => p.id === id.toLowerCase());
  return found ? [200, found] : [404, envelope('NOT_FOUND', 'the resource does not exist')];
}

/** A plain picture drawn here: no image comes from the internet. */
function svg(n) {
  const hue = (n * 47) % 360;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400">
<rect width="640" height="400" fill="hsl(${hue} 35% 72%)"/>
<rect y="280" width="640" height="120" fill="hsl(${hue} 30% 55%)"/>
<path d="M220 280V190l100-80 100 80v90z" fill="hsl(${hue} 25% 92%)"/>
<rect x="295" y="215" width="50" height="65" fill="hsl(${hue} 30% 40%)"/>
<text x="600" y="50" text-anchor="end" font-family="sans-serif" font-size="32" fill="#fff">${n}</text>
</svg>`;
}

const decode = (text) => { try { return decodeURIComponent(text); } catch { return text; } };

let traceId = '';
const envelope = (error, message, details) => ({ error, message, ...(details ? { details } : {}), traceId });

createServer((req, res) => {
  const url = new URL(req.url ?? '/', BASE);
  traceId = String(req.headers['x-correlation-id'] ?? randomUUID());
  res.setHeader('Access-Control-Allow-Origin', ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Correlation-Id, Idempotency-Key');
  res.setHeader('Access-Control-Expose-Headers', 'X-Correlation-Id');
  res.setHeader('X-Correlation-Id', traceId);
  if (req.method === 'OPTIONS') return res.writeHead(204).end();

  const foto = /^\/dev\/fotos\/(\d{1,2})\.svg$/.exec(url.pathname);
  if (req.method === 'GET' && foto) {
    return res.writeHead(200, { 'Content-Type': 'image/svg+xml' }).end(svg(Number(foto[1])));
  }
  const one = /^\/api\/v1\/propiedades\/([^/]+)$/.exec(url.pathname);
  const [status, body] =
    req.method !== 'GET' ? [404, envelope('NOT_FOUND', 'the resource does not exist')]
    : url.pathname === '/api/v1/propiedades' ? search(url.searchParams)
    : one ? detail(decode(one[1]))
    : [404, envelope('NOT_FOUND', 'the resource does not exist')];
  res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(body));
  console.log(`${req.method} ${req.url} ${status}`);
}).listen(PORT, () => console.log(`DEVELOPMENT ONLY — mock catalog api on ${BASE}`));
