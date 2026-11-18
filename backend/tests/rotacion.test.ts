import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  agregarRotacion,
  ProductoParaRotacion,
  SalidaParaRotacion,
} from '../src/utils/rotacion';

function producto(parcial: Partial<ProductoParaRotacion> & { id: string }): ProductoParaRotacion {
  return {
    nombre: 'Producto',
    sku: 'SKU-1',
    unidad_medida: 'unidad',
    stock: 0,
    precio_venta: 0,
    categoria: null,
    ...parcial,
  };
}

describe('agregarRotacion', () => {
  it('cruza productos con ventas y marca los que no rotan', () => {
    const productos: ProductoParaRotacion[] = [
      producto({ id: 'p1', nombre: 'Café', sku: 'CAF-1', stock: 5, precio_venta: 10, categoria: { nombre: 'Bebidas' } }),
      producto({ id: 'p2', nombre: 'Té', sku: 'TE-1', stock: 8, precio_venta: 4 }),
    ];
    const salidas: SalidaParaRotacion[] = [
      { producto_id: 'p1', cantidad: 2, fecha: '2026-01-10T10:00:00Z' },
      { producto_id: 'p1', cantidad: 3, fecha: '2026-01-15T10:00:00Z' },
    ];

    const reporte = agregarRotacion(productos, salidas);

    assert.equal(reporte.totales.productos, 2);
    assert.equal(reporte.totales.conMovimiento, 1);
    assert.equal(reporte.totales.sinMovimiento, 1);
    assert.equal(reporte.totales.unidades, 5);
    assert.equal(reporte.totales.ingreso, 50);

    // Café tiene ventas: 5 unidades * 10 = 50; va primero.
    assert.equal(reporte.items[0].producto_id, 'p1');
    assert.equal(reporte.items[0].unidadesVendidas, 5);
    assert.equal(reporte.items[0].ingreso, 50);
    assert.equal(reporte.items[0].ultimaVenta, '2026-01-15T10:00:00Z');
    assert.equal(reporte.items[0].sinMovimiento, false);

    assert.equal(reporte.items[1].producto_id, 'p2');
    assert.equal(reporte.items[1].sinMovimiento, true);
    assert.equal(reporte.items[1].ultimaVenta, null);
  });

  it('ordena por unidades vendidas y luego por nombre', () => {
    const productos: ProductoParaRotacion[] = [
      producto({ id: 'p1', nombre: 'Zeta' }),
      producto({ id: 'p2', nombre: 'Alfa' }),
      producto({ id: 'p3', nombre: 'Beta', precio_venta: 2 }),
    ];
    const salidas: SalidaParaRotacion[] = [
      { producto_id: 'p3', cantidad: 1, fecha: '2026-02-01T00:00:00Z' },
    ];

    const reporte = agregarRotacion(productos, salidas);
    // Beta (1) primero; luego los sin movimiento por nombre: Alfa, Zeta.
    assert.deepEqual(
      reporte.items.map((i) => i.nombre),
      ['Beta', 'Alfa', 'Zeta']
    );
  });

  it('tolera cantidades como texto y productos sin ventas', () => {
    const reporte = agregarRotacion(
      [producto({ id: 'p1', nombre: 'Café', precio_venta: '2,5' })],
      [{ producto_id: 'p1', cantidad: '2', fecha: '2026-03-01T00:00:00Z' }]
    );

    assert.equal(reporte.items[0].unidadesVendidas, 2);
    assert.equal(reporte.items[0].ingreso, 5);
  });
});
