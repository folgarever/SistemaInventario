import { describe, expect, it } from 'vitest';
import {
  diasDeFrecuencia,
  diferenciaConteo,
  estadoConteo,
  etiquetaFrecuencia,
  proximoConteo,
  resumenConteo,
} from './conteo.utils';

describe('frecuencias', () => {
  it('devuelve los dias de cada frecuencia', () => {
    expect(diasDeFrecuencia('DIARIO')).toBe(1);
    expect(diasDeFrecuencia('SEMANAL')).toBe(7);
    expect(diasDeFrecuencia('QUINCENAL')).toBe(15);
  });

  it('devuelve la etiqueta de cada frecuencia', () => {
    expect(etiquetaFrecuencia('DIARIO')).toBe('Diario');
    expect(etiquetaFrecuencia('QUINCENAL')).toBe('Quincenal');
  });
});

describe('proximoConteo', () => {
  it('devuelve null si no hay fecha base', () => {
    expect(proximoConteo(null, 'SEMANAL')).toBeNull();
    expect(proximoConteo('', 'SEMANAL')).toBeNull();
  });

  it('suma los dias de la frecuencia a la fecha base', () => {
    const proximo = proximoConteo('2026-11-01T10:00:00.000Z', 'SEMANAL');
    expect(proximo?.getFullYear()).toBe(2026);
    expect(proximo?.getMonth()).toBe(10); // noviembre
    expect(proximo?.getDate()).toBe(8);
  });

  it('soporta la frecuencia quincenal', () => {
    const proximo = proximoConteo(new Date(2026, 0, 1), 'QUINCENAL');
    expect(proximo?.getDate()).toBe(16);
  });
});

describe('estadoConteo', () => {
  it('sin fecha base marca tieneBase en false', () => {
    const estado = estadoConteo(null, 'SEMANAL', new Date(2026, 10, 10));
    expect(estado.tieneBase).toBe(false);
    expect(estado.vencido).toBe(false);
  });

  it('indica los dias que faltan', () => {
    const estado = estadoConteo(new Date(2026, 10, 1), 'SEMANAL', new Date(2026, 10, 5));
    expect(estado.tieneBase).toBe(true);
    expect(estado.vencido).toBe(false);
    expect(estado.diasRestantes).toBe(3);
  });

  it('marca vencido cuando ya paso la fecha', () => {
    const estado = estadoConteo(new Date(2026, 10, 1), 'SEMANAL', new Date(2026, 10, 10));
    expect(estado.vencido).toBe(true);
    expect(estado.diasRestantes).toBe(-2);
  });

  it('el mismo dia del proximo conteo no esta vencido', () => {
    const estado = estadoConteo(new Date(2026, 10, 1), 'DIARIO', new Date(2026, 10, 2));
    expect(estado.vencido).toBe(false);
    expect(estado.diasRestantes).toBe(0);
  });
});

describe('diferenciaConteo', () => {
  it('calcula sobrantes y faltantes', () => {
    expect(diferenciaConteo(12, 10)).toBe(2);
    expect(diferenciaConteo(8, 10)).toBe(-2);
    expect(diferenciaConteo('10.5', '10.5')).toBe(0);
  });
});

describe('resumenConteo', () => {
  it('ignora las lineas sin contar', () => {
    const resumen = resumenConteo([
      { contado: '', sistema: 10 },
      { contado: 10, sistema: 10 },
    ]);
    expect(resumen.contados).toBe(1);
    expect(resumen.diferencias).toBe(0);
  });

  it('cuenta sobrantes y faltantes', () => {
    const resumen = resumenConteo([
      { contado: 12, sistema: 10 }, // sobrante
      { contado: 7, sistema: 10 }, // faltante
      { contado: 5, sistema: 5 }, // coincide
    ]);
    expect(resumen.contados).toBe(3);
    expect(resumen.diferencias).toBe(2);
    expect(resumen.sobrantes).toBe(1);
    expect(resumen.faltantes).toBe(1);
  });
});
