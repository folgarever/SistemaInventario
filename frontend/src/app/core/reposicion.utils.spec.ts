import { describe, expect, it } from 'vitest';
import {
  agruparPorProveedor,
  cantidadSugerida,
  construirListaReposicion,
  ItemReposicion,
} from './reposicion.utils';
import { ReporteInventarioItem } from '../models';

function item(parcial: Partial<ReporteInventarioItem>): ReporteInventarioItem {
  return {
    id: 'p1',
    nombre: 'Producto',
    sku: 'SKU-1',
    categoria: null,
    proveedor: null,
    unidad_medida: 'unidad',
    stock: 0,
    stock_minimo: 0,
    precio_compra: 0,
    precio_venta: 0,
    valor_compra: 0,
    valor_venta: 0,
    estado: 'AGOTADO',
    ...parcial,
  };
}

describe('cantidadSugerida', () => {
  it('reponer hasta el doble del stock mínimo', () => {
    expect(cantidadSugerida(0, 5)).toBe(10);
    expect(cantidadSugerida(3, 5)).toBe(7);
  });

  it('devuelve 0 cuando ya está por encima del objetivo', () => {
    expect(cantidadSugerida(10, 5)).toBe(0);
    expect(cantidadSugerida(12, 5)).toBe(0);
  });

  it('sugiere al menos una unidad si está agotado y no tiene mínimo', () => {
    expect(cantidadSugerida(0, 0)).toBe(1);
  });

  it('admite cantidades decimales', () => {
    expect(cantidadSugerida(2.5, 2)).toBe(1.5);
  });

  it('trata los valores vacíos como cero', () => {
    expect(cantidadSugerida(null, '5')).toBe(10);
    expect(cantidadSugerida(undefined, undefined)).toBe(1);
  });
});

describe('construirListaReposicion', () => {
  it('incluye solo los productos agotados o bajo stock', () => {
    const lista = construirListaReposicion([
      item({ id: 'a', nombre: 'Agotado', stock: 0, stock_minimo: 4, precio_compra: 2 }),
      item({ id: 'b', nombre: 'Bajo', stock: 2, stock_minimo: 5, precio_compra: 3 }),
      item({ id: 'c', nombre: 'Disponible', stock: 20, stock_minimo: 5, estado: 'DISPONIBLE' }),
    ]);

    expect(lista.items.map((i) => i.id)).toEqual(['a', 'b']);
    expect(lista.totales).toEqual({
      productos: 2,
      agotados: 1,
      bajoStock: 1,
      costoEstimado: 16 + 24,
    });
  });

  it('calcula el costo estimado con la cantidad sugerida', () => {
    const lista = construirListaReposicion([
      item({ id: 'a', stock: 1, stock_minimo: 2, precio_compra: 1.5 }),
    ]);

    // objetivo = 4, sugerido = 3, costo = 4.5
    expect(lista.items[0].sugerido).toBe(3);
    expect(lista.items[0].costo_estimado).toBe(4.5);
  });

  it('ordena por proveedor y luego por nombre', () => {
    const lista = construirListaReposicion([
      item({ id: 'a', nombre: 'Zeta', proveedor: 'Proveedor B', stock: 0, stock_minimo: 1 }),
      item({ id: 'b', nombre: 'Alfa', proveedor: 'Proveedor A', stock: 0, stock_minimo: 1 }),
      item({ id: 'c', nombre: 'Beta', proveedor: 'Proveedor B', stock: 0, stock_minimo: 1 }),
    ]);

    expect(lista.items.map((i) => i.nombre)).toEqual(['Alfa', 'Beta', 'Zeta']);
  });

  it('devuelve una lista vacía sin productos', () => {
    const lista = construirListaReposicion([]);
    expect(lista.items).toEqual([]);
    expect(lista.totales.productos).toBe(0);
  });
});

describe('agruparPorProveedor', () => {
  it('agrupa por proveedor y deja "Sin proveedor" al final', () => {
    const items: ItemReposicion[] = [
      { ...reposicionBase(), id: 'a', proveedor: 'Proveedor B' },
      { ...reposicionBase(), id: 'b', proveedor: null },
      { ...reposicionBase(), id: 'c', proveedor: 'Proveedor A' },
    ];

    const grupos = agruparPorProveedor(items);

    expect(grupos.map((g) => g.proveedor)).toEqual(['Proveedor A', 'Proveedor B', 'Sin proveedor']);
    expect(grupos[2].items).toHaveLength(1);
  });
});

function reposicionBase(): ItemReposicion {
  return {
    id: 'x',
    nombre: 'Producto',
    sku: 'SKU',
    unidad_medida: 'unidad',
    categoria: null,
    proveedor: null,
    stock: 0,
    stock_minimo: 1,
    precio_compra: 1,
    sugerido: 2,
    costo_estimado: 2,
  };
}
