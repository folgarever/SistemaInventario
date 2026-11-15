import { describe, expect, it } from 'vitest';
import { construirCsv, fechaArchivo } from './csv.utils';

describe('construirCsv', () => {
  it('une las filas con punto y coma y saltos CRLF', () => {
    const csv = construirCsv([
      ['SKU', 'Producto'],
      ['A-1', 'Arroz'],
    ]);
    expect(csv).toBe('SKU;Producto\r\nA-1;Arroz');
  });

  it('convierte nulos y undefined en celdas vacías', () => {
    expect(construirCsv([[null, undefined, 'x']])).toBe(';;x');
  });

  it('escapa celdas que contienen el separador o comillas', () => {
    expect(construirCsv([['a;b', 'c"d']])).toBe('"a;b";"c""d"');
  });

  it('escapa celdas con saltos de línea', () => {
    expect(construirCsv([['linea1\nlinea2']])).toBe('"linea1\nlinea2"');
  });

  it('convierte números a texto sin formato', () => {
    expect(construirCsv([[1.5, 10]])).toBe('1.5;10');
  });
});

describe('fechaArchivo', () => {
  it('devuelve la fecha en formato aaaa-mm-dd', () => {
    expect(fechaArchivo()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
