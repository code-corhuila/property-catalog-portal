import { Component, inject, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { FieldError } from '../../shell-contract';
import { PropiedadFilters } from '../model/propiedad';

type Field = 'ciudad' | 'fechaInicio' | 'fechaFin' | 'huespedes';
const FIELDS: Field[] = ['ciudad', 'fechaInicio', 'fechaFin', 'huespedes'];
const GUESTS = { min: 1, max: 20 };

/** Our own text for each field a 400 can name: the `message` of the API is never shown. */
const SERVER_TEXT: Record<Field, string> = {
  ciudad: 'Escribe el nombre de una ciudad, por ejemplo Cartagena',
  fechaInicio: 'Elige una fecha de llegada válida',
  fechaFin: 'Elige una fecha de salida posterior a la llegada',
  huespedes: 'Indica entre 1 y 20 huéspedes',
};

/** The search of Explore: city, dates and guests (catalog-service.yaml, GET /propiedades). */
@Component({
  selector: 'app-search-form',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate aria-label="Buscar propiedades">
      <div class="field city">
        <label for="ciudad">¿A dónde quieres ir?</label>
        <input id="ciudad" formControlName="ciudad" autocomplete="off" (input)="edited('ciudad')"
               [attr.aria-invalid]="!!error('ciudad')" [attr.aria-describedby]="error('ciudad') ? 'ciudad-error' : null" />
        @if (error('ciudad'); as e) { <p id="ciudad-error" class="error">{{ e }}</p> }
      </div>
      <div class="field">
        <label for="fechaInicio">Llegada</label>
        <input id="fechaInicio" type="date" formControlName="fechaInicio" (input)="edited('fechaInicio')"
               [attr.aria-invalid]="!!error('fechaInicio')" [attr.aria-describedby]="error('fechaInicio') ? 'fechaInicio-error' : null" />
        @if (error('fechaInicio'); as e) { <p id="fechaInicio-error" class="error">{{ e }}</p> }
      </div>
      <div class="field">
        <label for="fechaFin">Salida</label>
        <input id="fechaFin" type="date" formControlName="fechaFin" (input)="edited('fechaFin')"
               [attr.aria-invalid]="!!error('fechaFin')" [attr.aria-describedby]="error('fechaFin') ? 'fechaFin-error' : null" />
        @if (error('fechaFin'); as e) { <p id="fechaFin-error" class="error">{{ e }}</p> }
      </div>
      <div class="field">
        <label for="huespedes">Huéspedes</label>
        <div class="stepper">
          <button type="button" aria-label="Quitar un huésped" [disabled]="guests() <= 1" (click)="step(-1)">−</button>
          <input id="huespedes" type="number" inputmode="numeric" min="1" max="20" formControlName="huespedes" (input)="edited('huespedes')"
                 [attr.aria-invalid]="!!error('huespedes')" [attr.aria-describedby]="error('huespedes') ? 'huespedes-error' : null" />
          <button type="button" aria-label="Agregar un huésped" [disabled]="guests() >= 20" (click)="step(1)">+</button>
        </div>
        @if (error('huespedes'); as e) { <p id="huespedes-error" class="error">{{ e }}</p> }
      </div>
      <div class="actions">
        <button type="submit" class="primary">Buscar</button>
        <button type="button" (click)="clear()">Limpiar</button>
      </div>
    </form>
  `,
  styles: `
    form {
      display: grid; gap: var(--space-4); align-items: start; margin-bottom: var(--space-8);
      grid-template-columns: repeat(auto-fit, minmax(min(100%, calc(var(--space-16) * 3)), 1fr));
    }
    .city { grid-column: 1 / -1; }
    .field { display: grid; gap: var(--space-1); }
    label { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); line-height: var(--line-height-normal); }
    input {
      padding: var(--space-2) var(--space-3); font: inherit; background: var(--color-bg-card);
      border: solid var(--color-neutral-disabled); border-radius: var(--radius-md);
    }
    input[aria-invalid='true'] { border-color: var(--color-error); }
    .error { margin: 0; color: var(--color-error); font-size: var(--font-size-sm); }
    .stepper { display: grid; grid-template-columns: auto 1fr auto; gap: var(--space-2); }
    .stepper input { text-align: center; }
    /* Level with the inputs, below a label's height, whatever error message grows the row. */
    .actions { display: flex; gap: var(--space-2); margin-top: calc(var(--font-size-sm) * var(--line-height-normal) + var(--space-1)); }
    button {
      padding: var(--space-2) var(--space-4); cursor: pointer; font: inherit; color: var(--color-primary-900);
      background: var(--color-bg-card); border: solid var(--color-primary-900); border-radius: var(--radius-md);
    }
    .primary { color: var(--color-text-on-dark); background: var(--color-primary-500); border-color: var(--color-primary-500); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
  `,
})
export class SearchFormComponent {
  readonly search = output<PropiedadFilters>();
  readonly form = inject(NonNullableFormBuilder).group({
    ciudad: '',
    fechaInicio: '',
    fechaFin: '',
    huespedes: null as number | null,
  });
  /** Client errors show from the first "Buscar" on. */
  private readonly submitted = signal(false);
  private readonly serverErrors = signal<Partial<Record<Field, string>>>({});

  error(field: Field): string | null {
    return this.serverErrors()[field] ?? (this.submitted() ? this.clientError(field) : null);
  }

  guests(): number {
    return this.form.controls.huespedes.value ?? 0;
  }

  step(by: number): void {
    const next = Math.min(GUESTS.max, Math.max(GUESTS.min, this.guests() + by));
    this.form.controls.huespedes.setValue(next);
    this.edited('huespedes');
  }

  edited(field: Field): void {
    this.serverErrors.update(({ [field]: _, ...rest }) => rest);
  }

  submit(): void {
    this.submitted.set(true);
    this.serverErrors.set({});
    if (FIELDS.some((field) => this.clientError(field))) return;
    const { ciudad, fechaInicio, fechaFin, huespedes } = this.form.getRawValue();
    const filters: PropiedadFilters = {};
    if (ciudad.trim()) filters.ciudad = ciudad.trim();
    if (fechaInicio && fechaFin) Object.assign(filters, { fechaInicio, fechaFin });
    if (huespedes !== null) filters.huespedes = huespedes;
    this.search.emit(filters);
  }

  clear(): void {
    this.form.reset();
    this.submitted.set(false);
    this.serverErrors.set({});
    this.search.emit({});
  }

  /** Places each error of a 400 next to its field. False when none belongs to this form. */
  showServerErrors(details: FieldError[]): boolean {
    const placed = details.map((d) => d.field).filter((f): f is Field => FIELDS.includes(f as Field));
    this.serverErrors.set(Object.fromEntries(placed.map((f) => [f, SERVER_TEXT[f]])));
    return placed.length > 0;
  }

  private clientError(field: Field): string | null {
    const { fechaInicio, fechaFin, huespedes } = this.form.getRawValue();
    if (field === 'fechaInicio' && fechaFin && !fechaInicio) return 'Indica también la fecha de llegada';
    if (field === 'fechaFin' && fechaInicio && !fechaFin) return 'Indica también la fecha de salida';
    // 'yyyy-mm-dd' strings compare in date order.
    if (field === 'fechaFin' && fechaInicio && fechaFin && fechaFin <= fechaInicio) return 'La salida debe ser posterior a la llegada';
    if (field === 'huespedes' && huespedes !== null
        && !(Number.isInteger(huespedes) && huespedes >= GUESTS.min && huespedes <= GUESTS.max)) {
      return SERVER_TEXT.huespedes;
    }
    return null;
  }
}
