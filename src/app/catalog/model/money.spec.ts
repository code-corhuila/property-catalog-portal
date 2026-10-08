import { formatCents } from './money';

describe('formatCents', () => {
  it('formats whole pesos with dots between thousands and the currency', () => {
    expect(formatCents(50000000, 'COP')).toBe('$500.000 COP');
    expect(formatCents(157500000, 'COP')).toBe('$1.575.000 COP');
  });

  it('shows the cents only when they are not zero', () => {
    expect(formatCents(50000050, 'COP')).toBe('$500.000,50 COP');
    expect(formatCents(105, 'COP')).toBe('$1,05 COP');
  });

  it('handles small amounts and zero', () => {
    expect(formatCents(99900, 'COP')).toBe('$999 COP');
    expect(formatCents(0, 'COP')).toBe('$0 COP');
  });
});
