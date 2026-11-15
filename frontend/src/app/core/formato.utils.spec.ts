import { describe, expect, it } from 'vitest';
import {
  estadoStock,
  etiquetaEstadoStock,
  formatoCantidad,
  formatoMoneda,
  numero,
} from './formato.utils';

describe('numero', () => {
  it('devuelve 0 para valores vacíos', () => {
    expect(numero(null)).toBe(0);
    expect(numero(undefined)).toBe(0);
    expect(numero('')).toBe(0);
  });

  it('convierte cadenas numéricas de la API', () => {
    expect(numero('12.5')).toBe(12.5);
    expect(numero('12,5')).toBe(12.5);
  });

  it('devuelve 0 para valores no numéricos', () => {
    expect(numero('abc')).toBe(0);
    expect(numero(NaN)).toBe(0);
    expect(numero(Infinity)).toBe(0);
  });

  it('deja pasar los números tal cual', () => {
    expect(numero(42)).toBe(42);
    expect(numero(-3.25)).toBe(-3.25);
  });
});

describe('formatoMoneda', () => {
  it('formatea con dos decimales', () => {
    const texto = formatoMoneda('1234.5');
    expect(texto).toContain('1');
    expect(texto).toMatch(/1\.?234,50/);
  });

  it('formatea el cero', () => {
    expect(formatoMoneda(null)).toMatch(/0,00/);
  });
});

describe('formatoCantidad', () => {
  it('admite hasta tres decimales', () => {
    expect(formatoCantidad('2.5')).toMatch(/2,5/);
    expect(formatoCantidad('1.2345')).toMatch(/1,23/);
  });
});

describe('estadoStock', () => {
  it('marca agotado cuando no hay existencias', () => {
    expect(estadoStock(0, 5)).toBe('agotado');
    expect(estadoStock(-1, 5)).toBe('agotado');
  });

  it('marca bajo cuando está en el mínimo o por debajo', () => {
    expect(estadoStock(5, 5)).toBe('bajo');
    expect(estadoStock('2.5', '5')).toBe('bajo');
  });

  it('marca disponible cuando supera el mínimo', () => {
    expect(estadoStock(10, 5)).toBe('disponible');
  });
});

describe('etiquetaEstadoStock', () => {
  it('traduce cada estado a su etiqueta', () => {
    expect(etiquetaEstadoStock('agotado')).toBe('Agotado');
    expect(etiquetaEstadoStock('bajo')).toBe('Bajo stock');
    expect(etiquetaEstadoStock('disponible')).toBe('Disponible');
  });
});
