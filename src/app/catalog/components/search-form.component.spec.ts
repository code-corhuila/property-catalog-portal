import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PropiedadFilters } from '../model/propiedad';
import { SearchFormComponent } from './search-form.component';

describe('SearchFormComponent', () => {
  let fixture: ComponentFixture<SearchFormComponent>;
  let sent: PropiedadFilters[];

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(SearchFormComponent);
    sent = [];
    fixture.componentInstance.search.subscribe((filters) => sent.push(filters));
    await fixture.whenStable();
  });

  const element = (): HTMLElement => fixture.nativeElement;
  const input = (id: string) => element().querySelector<HTMLInputElement>(`#${id}`)!;
  const button = (text: string) =>
    Array.from(element().querySelectorAll('button')).find((b) => b.textContent?.trim() === text)!;
  async function type(id: string, value: string): Promise<void> {
    input(id).value = value;
    input(id).dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }
  async function press(text: string): Promise<void> {
    button(text).click();
    await fixture.whenStable();
  }
  /** The message the field points to with aria-describedby, or null. */
  function errorOf(id: string): string | null {
    const describedBy = input(id).getAttribute('aria-describedby');
    return describedBy ? element().querySelector(`#${describedBy}`)?.textContent?.trim() ?? null : null;
  }

  it('has a visible label for each of the four fields', () => {
    const labels = Array.from(element().querySelectorAll('label')).map((l) => [l.htmlFor, l.textContent?.trim()]);
    expect(labels).toEqual([
      ['ciudad', '¿A dónde quieres ir?'], ['fechaInicio', 'Llegada'], ['fechaFin', 'Salida'], ['huespedes', 'Huéspedes'],
    ]);
    expect(input('fechaInicio').type).toBe('date');
    expect(input('fechaFin').type).toBe('date');
  });

  it('sends only the filters that were filled', async () => {
    await type('ciudad', '  Cartagena ');
    await press('Buscar');
    expect(sent).toEqual([{ ciudad: 'Cartagena' }]);
  });

  it('sends the four filters when all of them are filled', async () => {
    await type('ciudad', 'Bogotá');
    await type('fechaInicio', '2026-11-01');
    await type('fechaFin', '2026-11-04');
    await press('+');
    await press('+');
    await press('Buscar');
    expect(sent).toEqual([{ ciudad: 'Bogotá', fechaInicio: '2026-11-01', fechaFin: '2026-11-04', huespedes: 2 }]);
  });

  it('asks for the check-out date when only the check-in date is set, and does not send', async () => {
    await type('fechaInicio', '2026-11-01');
    await press('Buscar');
    expect(errorOf('fechaFin')).toBe('Indica también la fecha de salida');
    expect(input('fechaFin').getAttribute('aria-invalid')).toBe('true');
    expect(sent).toEqual([]);
  });

  it('asks for the check-in date when only the check-out date is set', async () => {
    await type('fechaFin', '2026-11-04');
    await press('Buscar');
    expect(errorOf('fechaInicio')).toBe('Indica también la fecha de llegada');
    expect(sent).toEqual([]);
  });

  it('asks for a check-out after the check-in', async () => {
    await type('fechaInicio', '2026-11-04');
    await type('fechaFin', '2026-11-04');
    await press('Buscar');
    expect(errorOf('fechaFin')).toBe('La salida debe ser posterior a la llegada');
    expect(sent).toEqual([]);
  });

  it('keeps the guests from 1 to 20', async () => {
    await type('huespedes', '21');
    await press('Buscar');
    expect(errorOf('huespedes')).toBe('Indica entre 1 y 20 huéspedes');
    expect(sent).toEqual([]);
    await type('huespedes', '20');
    expect(button('+').disabled).toBe(true);
    await type('huespedes', '1');
    expect(button('−').disabled).toBe(true);
    expect(errorOf('huespedes')).toBeNull();
  });

  it('shows no error before the first search', async () => {
    await type('fechaInicio', '2026-11-01');
    expect(errorOf('fechaFin')).toBeNull();
  });

  it('places each error of a 400 next to its field, with its own text and never the message of the API', async () => {
    const placed = fixture.componentInstance.showServerErrors([
      { field: 'fechaFin', message: 'must be after fechaInicio' },
      { field: 'huespedes', message: 'must be an integer from 1 to 20' },
    ]);
    await fixture.whenStable();
    expect(placed).toBe(true);
    expect(errorOf('fechaFin')).toBe('Elige una fecha de salida posterior a la llegada');
    expect(errorOf('huespedes')).toBe('Indica entre 1 y 20 huéspedes');
    expect(element().textContent).not.toContain('must be');
  });

  it('says when no error of a 400 belongs to a field of the form', () => {
    expect(fixture.componentInstance.showServerErrors([{ field: 'limit', message: 'must be between 1 and 100' }])).toBe(false);
  });

  it('"Limpiar" empties the fields and the errors and asks for everything', async () => {
    await type('ciudad', 'Cali');
    await type('fechaInicio', '2026-11-01');
    await press('Buscar');
    await press('Limpiar');
    expect(input('ciudad').value).toBe('');
    expect(errorOf('fechaFin')).toBeNull();
    expect(sent).toEqual([{}]);
  });
});
