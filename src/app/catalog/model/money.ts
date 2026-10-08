/**
 * Money crosses the boundary in minor units with its currency. 50000000 COP is shown as
 * "$500.000 COP": integer arithmetic only, and the same text whatever the locale of the
 * device. The cents are shown only when they are not zero ("$500.000,50 COP").
 */
export function formatCents(cents: number, moneda: string): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.trunc(cents));
  const units = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const rest = abs % 100;
  return `${sign}$${units}${rest ? ',' + String(rest).padStart(2, '0') : ''} ${moneda}`;
}
