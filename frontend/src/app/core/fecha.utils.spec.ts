import { describe, expect, it } from 'vitest';
import {
  aISO,
  dentroDeRango,
  fechaCorta,
  fechaHora,
  hoyInput,
  primerDiaMesInput,
} from './fecha.utils';

describe('aISO', () => {
  it('devuelve undefined para valores vacíos', () => {
    expect(aISO('')).toBeUndefined();
    expect(aISO(null)).toBeUndefined();
    expect(aISO(undefined)).toBeUndefined();
  });

  it('convierte una fecha local a ISO', () => {
    const iso = aISO('2026-01-15');
    expect(iso).toBeDefined();
    expect(iso).toMatch(/^2026-01-15T/);
  });

  it('devuelve undefined para fechas inválidas', () => {
    expect(aISO('no-es-fecha')).toBeUndefined();
  });
});

describe('fechaCorta y fechaHora', () => {
  it('muestran un guion cuando no hay fecha', () => {
    expect(fechaCorta(null)).toBe('-');
    expect(fechaHora(undefined)).toBe('-');
    expect(fechaCorta('fecha-mala')).toBe('-');
  });

  it('formatean una fecha ISO a dd/mm/aaaa', () => {
    const iso = new Date(2026, 0, 5, 9, 30).toISOString();
    expect(fechaCorta(iso)).toBe('05/01/2026');
    expect(fechaHora(iso)).toBe('05/01/2026 09:30');
  });
});

describe('hoyInput y primerDiaMesInput', () => {
  it('devuelven formatos válidos para input date', () => {
    expect(hoyInput()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(primerDiaMesInput()).toMatch(/^\d{4}-\d{2}-01$/);
  });
});

describe('dentroDeRango', () => {
  it('acepta valores sin fecha', () => {
    expect(dentroDeRango(null, '2026-01-01', '2026-12-31')).toBe(true);
  });

  it('incluye los extremos del rango', () => {
    const iso = new Date(2026, 5, 15, 12, 0).toISOString();
    expect(dentroDeRango(iso, '2026-06-15', '2026-06-15')).toBe(true);
  });

  it('excluye valores fuera del rango', () => {
    const iso = new Date(2026, 0, 1, 12, 0).toISOString();
    expect(dentroDeRango(iso, '2026-06-01', '2026-06-30')).toBe(false);
  });
});
