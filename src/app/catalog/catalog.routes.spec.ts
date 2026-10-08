import { EXPLORE_ROUTES, PROPERTY_ROUTES } from './catalog.routes';
import { ExplorePageComponent } from './pages/explore-page.component';
import { PropertyPageComponent } from './pages/property-page.component';

describe('catalog routes', () => {
  it('exports EXPLORE_ROUTES with one route, the explore page titled "Explorar", for /explorar', () => {
    expect(EXPLORE_ROUTES).toHaveLength(1);
    expect(EXPLORE_ROUTES[0]).toMatchObject({ path: '', title: 'Explorar', component: ExplorePageComponent });
  });

  it('exports PROPERTY_ROUTES with one route, the property page titled "Detalle de la propiedad", for /propiedades/:propiedadId', () => {
    expect(PROPERTY_ROUTES).toHaveLength(1);
    expect(PROPERTY_ROUTES[0]).toMatchObject({ path: '', title: 'Detalle de la propiedad', component: PropertyPageComponent });
  });
});
