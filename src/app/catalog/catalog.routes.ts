import { Routes } from '@angular/router';
import { ExplorePageComponent } from './pages/explore-page.component';
import { PropertyPageComponent } from './pages/property-page.component';

/** Exposed to the container as './routes'. Mounted on /explorar. */
export const EXPLORE_ROUTES: Routes = [{ path: '', title: 'Explorar', component: ExplorePageComponent }];

/** Exposed to the container as './routes'. Mounted on /propiedades/:propiedadId. */
export const PROPERTY_ROUTES: Routes = [{ path: '', title: 'Detalle de la propiedad', component: PropertyPageComponent }];
