import { describe, expect, it } from 'vitest';
import { existenciasTrasDevolucion } from './devolucion.utils';

describe('existenciasTrasDevolucion', () => {
  it('suma la cantidad devuelta al stock actual', () => {
    expect(existenciasTrasDevolucion(5, 3)).toBe(8);
    expect(existenciasTrasDevolucion(0, 2.5)).toBe(2.5);
  });

  it('mantiene la precision de cantidades decimales', () => {
    expect(existenciasTrasDevolucion(1.1, 0.2)).toBe(1.3);
  });

  it('trata stock o cantidad invalidos como cero', () => {
    expect(existenciasTrasDevolucion(Number.NaN, 4)).toBe(4);
    expect(existenciasTrasDevolucion(5, -3)).toBe(5);
    expect(existenciasTrasDevolucion(-2, 1)).toBe(1);
  });
});
