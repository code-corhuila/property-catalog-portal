import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { EXPLORE_ROUTES, PROPERTY_ROUTES } from './catalog/catalog.routes';

/**
 * Standalone runs only, on the container's mount points. Deliberately NO
 * provideHttpClient(): inside the container the portal uses the container's client.
 */
export const appConfig: ApplicationConfig = {
  providers: [provideZonelessChangeDetection(), provideRouter([
    { path: 'explorar', children: EXPLORE_ROUTES },
    { path: 'propiedades/:propiedadId', children: PROPERTY_ROUTES },
    { path: '**', redirectTo: 'explorar' },
  ])],
};
