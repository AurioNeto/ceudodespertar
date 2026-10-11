import { describe, expect, it } from 'vitest';
import { diasDesde } from './diasDesde';

describe('diasDesde', () => {
  it('conta os dias corridos entre a data e hoje', () => {
    expect(diasDesde('2026-07-11', '2026-09-02')).toBe(53);
  });

  it('atravessa a virada do mês e do ano', () => {
    expect(diasDesde('2025-12-30', '2026-01-02')).toBe(3);
  });

  it('a mesma data dá zero', () => {
    expect(diasDesde('2026-09-02', '2026-09-02')).toBe(0);
  });

  it('data depois de hoje não fica negativa', () => {
    expect(diasDesde('2026-09-10', '2026-09-02')).toBe(0);
  });
});
