import { describe, expect, it } from 'vitest';
import { fechaArchivo, fechaHoraArchivo } from './pdf.utils';

describe('fechaArchivo', () => {
  it('devuelve la fecha en formato aaaa-mm-dd', () => {
    expect(fechaArchivo()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('fechaHoraArchivo', () => {
  it('devuelve la fecha y hora en formato dd/mm/aaaa hh:mm', () => {
    expect(fechaHoraArchivo()).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });
});
