import { describe, expect, it } from 'vitest';
import { AlertaStock } from '../models';
import { alertasNuevas, firmaAlertas, resumenNotificacion } from './notificaciones.utils';

function alerta(parcial: Partial<AlertaStock> & { id: string; estado: 'AGOTADO' | 'BAJO' }): AlertaStock {
  return {
    nombre: 'Producto',
    sku: 'SKU-1',
    unidad_medida: 'unidad',
    stock: 0,
    stock_minimo: 5,
    faltante: 5,
    ...parcial,
  };
}

describe('firmaAlertas', () => {
  it('mapea cada producto a su estado', () => {
    const firma = firmaAlertas([
      alerta({ id: 'p1', estado: 'AGOTADO' }),
      alerta({ id: 'p2', estado: 'BAJO' }),
    ]);

    expect(firma).toEqual({ p1: 'AGOTADO', p2: 'BAJO' });
  });
});

describe('alertasNuevas', () => {
  it('devuelve solo los productos que aparecen o cambian de estado', () => {
    const items = [
      alerta({ id: 'p1', estado: 'AGOTADO' }),
      alerta({ id: 'p2', estado: 'BAJO' }),
      alerta({ id: 'p3', estado: 'BAJO' }),
    ];
    const previas = { p1: 'AGOTADO', p2: 'AGOTADO' };

    const nuevas = alertasNuevas(items, previas);

    expect(nuevas.map((n) => n.id)).toEqual(['p2', 'p3']);
  });

  it('no devuelve nada si todo sigue igual', () => {
    const items = [alerta({ id: 'p1', estado: 'BAJO' })];
    expect(alertasNuevas(items, { p1: 'BAJO' })).toHaveLength(0);
  });
});

describe('resumenNotificacion', () => {
  it('devuelve null sin alertas', () => {
    expect(resumenNotificacion([])).toBeNull();
  });

  it('resume un solo producto agotado', () => {
    const resumen = resumenNotificacion([
      alerta({ id: 'p1', nombre: 'Café', sku: 'CAF-1', estado: 'AGOTADO', stock: 0, stock_minimo: 5 }),
    ]);

    expect(resumen?.titulo).toBe('Producto agotado');
    expect(resumen?.cuerpo).toContain('Café');
    expect(resumen?.cuerpo).toContain('CAF-1');
  });

  it('resume un solo producto con stock bajo', () => {
    const resumen = resumenNotificacion([alerta({ id: 'p1', estado: 'BAJO' })]);
    expect(resumen?.titulo).toBe('Stock bajo');
  });

  it('resume varios productos y cuenta los agotados', () => {
    const resumen = resumenNotificacion([
      alerta({ id: 'p1', nombre: 'Café', estado: 'AGOTADO' }),
      alerta({ id: 'p2', nombre: 'Té', estado: 'BAJO' }),
    ]);

    expect(resumen?.titulo).toBe('2 productos requieren reposición');
    expect(resumen?.cuerpo).toContain('Café');
    expect(resumen?.cuerpo).toContain('Té');
    expect(resumen?.cuerpo).toContain('1 agotado');
  });

  it('agrega "y N más" cuando hay más de tres productos', () => {
    const resumen = resumenNotificacion([
      alerta({ id: 'p1', nombre: 'Uno', estado: 'BAJO' }),
      alerta({ id: 'p2', nombre: 'Dos', estado: 'BAJO' }),
      alerta({ id: 'p3', nombre: 'Tres', estado: 'BAJO' }),
      alerta({ id: 'p4', nombre: 'Cuatro', estado: 'BAJO' }),
    ]);

    expect(resumen?.cuerpo).toContain('y 1 más');
  });
});
