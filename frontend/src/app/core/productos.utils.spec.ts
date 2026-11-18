import { describe, expect, it } from 'vitest';
import { Producto } from '../models';
import {
  ORDEN_PRODUCTO_INICIAL,
  alternarOrden,
  ariaOrden,
  indicadorOrden,
  ordenarProductos,
  valorOrden,
} from './productos.utils';

function producto(parcial: Partial<Producto>): Producto {
  return {
    id: parcial.id ?? 'p',
    user_id: 'u',
    categoria_id: null,
    proveedor_id: null,
    nombre: 'Producto',
    sku: 'SKU',
    descripcion: null,
    precio_compra: 0,
    precio_venta: 0,
    stock: 0,
    stock_minimo: 0,
    unidad_medida: 'unidad',
    imagen_url: null,
    activo: true,
    ...parcial,
  };
}

describe('valorOrden', () => {
  it('devuelve el texto de las columnas de texto', () => {
    const p = producto({ sku: 'A-1', nombre: 'Arroz', categoria: { id: 'c', nombre: 'Abarrotes' } });
    expect(valorOrden(p, 'sku')).toBe('A-1');
    expect(valorOrden(p, 'nombre')).toBe('Arroz');
    expect(valorOrden(p, 'categoria')).toBe('Abarrotes');
  });

  it('devuelve 0 cuando no hay categoria', () => {
    expect(valorOrden(producto({ categoria: null }), 'categoria')).toBe('');
  });

  it('calcula ganancia y numero a partir de cadenas', () => {
    const p = producto({ precio_compra: '10.5', precio_venta: '15', stock: '3' });
    expect(valorOrden(p, 'ganancia')).toBeCloseTo(4.5);
    expect(valorOrden(p, 'stock')).toBe(3);
  });

  it('pondera el estado con los mas urgentes primero', () => {
    expect(valorOrden(producto({ stock: 0, stock_minimo: 5 }), 'estado')).toBe(0); // agotado
    expect(valorOrden(producto({ stock: 3, stock_minimo: 5 }), 'estado')).toBe(1); // bajo
    expect(valorOrden(producto({ stock: 9, stock_minimo: 5 }), 'estado')).toBe(2); // disponible
  });
});

describe('ordenarProductos', () => {
  it('ordena por nombre ascendente por defecto', () => {
    const lista = [producto({ nombre: 'Zanahoria' }), producto({ nombre: 'Arroz' })];
    const ordenada = ordenarProductos(lista, ORDEN_PRODUCTO_INICIAL);
    expect(ordenada.map((p) => p.nombre)).toEqual(['Arroz', 'Zanahoria']);
  });

  it('ordena numeros de forma numerica, no alfabetica', () => {
    const lista = [producto({ stock: 10 }), producto({ stock: 2 }), producto({ stock: 1 })];
    const ordenada = ordenarProductos(lista, { columna: 'stock', direccion: 'asc' });
    expect(ordenada.map((p) => Number(p.stock))).toEqual([1, 2, 10]);
  });

  it('respeta la direccion descendente', () => {
    const lista = [producto({ precio_venta: 5 }), producto({ precio_venta: 20 })];
    const ordenada = ordenarProductos(lista, { columna: 'precio_venta', direccion: 'desc' });
    expect(ordenada.map((p) => Number(p.precio_venta))).toEqual([20, 5]);
  });

  it('no modifica el arreglo original', () => {
    const lista = [producto({ nombre: 'B' }), producto({ nombre: 'A' })];
    const copia = [...lista];
    ordenarProductos(lista, ORDEN_PRODUCTO_INICIAL);
    expect(lista).toEqual(copia);
  });
});

describe('alternarOrden', () => {
  it('cambia a ascendente al elegir otra columna', () => {
    const orden = alternarOrden({ columna: 'nombre', direccion: 'desc' }, 'stock');
    expect(orden).toEqual({ columna: 'stock', direccion: 'asc' });
  });

  it('invierte la direccion al repetir la misma columna', () => {
    const orden = alternarOrden({ columna: 'stock', direccion: 'asc' }, 'stock');
    expect(orden).toEqual({ columna: 'stock', direccion: 'desc' });
  });
});

describe('indicadores de orden', () => {
  const orden = { columna: 'stock', direccion: 'asc' } as const;

  it('muestra la flecha solo en la columna activa', () => {
    expect(indicadorOrden(orden, 'stock')).toBe('↑');
    expect(indicadorOrden(orden, 'nombre')).toBe('');
    expect(indicadorOrden({ columna: 'stock', direccion: 'desc' }, 'stock')).toBe('↓');
  });

  it('expone el aria-sort correcto', () => {
    expect(ariaOrden(orden, 'stock')).toBe('ascending');
    expect(ariaOrden(orden, 'nombre')).toBe('none');
    expect(ariaOrden({ columna: 'stock', direccion: 'desc' }, 'stock')).toBe('descending');
  });
});
