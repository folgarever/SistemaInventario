import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { agregarMermas, MOTIVOS_MERMA, SalidaParaMerma } from '../src/utils/mermas';

function salida(
  motivo: string,
  cantidad: number,
  producto: { id: string; nombre: string; sku: string; unidad_medida: string; precio_compra: number } | null
): SalidaParaMerma {
  return { motivo, cantidad, producto };
}

describe('agregarMermas', () => {
  it('solo contempla los motivos DANADO y PERDIDO', () => {
    assert.deepEqual([...MOTIVOS_MERMA], ['DANADO', 'PERDIDO']);

    const reporte = agregarMermas([
      salida('DANADO', 2, { id: 'p1', nombre: 'Café', sku: 'CAF-1', unidad_medida: 'kg', precio_compra: 6 }),
      salida('VENTA', 5, { id: 'p2', nombre: 'Té', sku: 'TE-1', unidad_medida: 'kg', precio_compra: 4 }),
      salida('USO_INTERNO', 1, { id: 'p3', nombre: 'Azúcar', sku: 'AZU-1', unidad_medida: 'kg', precio_compra: 2 }),
    ]);

    assert.equal(reporte.items.length, 1);
    assert.equal(reporte.totales.operaciones, 1);
    assert.equal(reporte.totales.unidades, 2);
    assert.equal(reporte.totales.costo, 12);
  });

  it('agrupa por producto y separa unidades por motivo', () => {
    const reporte = agregarMermas([
      salida('DANADO', 2, { id: 'p1', nombre: 'Café', sku: 'CAF-1', unidad_medida: 'kg', precio_compra: 6 }),
      salida('PERDIDO', 3, { id: 'p1', nombre: 'Café', sku: 'CAF-1', unidad_medida: 'kg', precio_compra: 6 }),
      salida('DANADO', 1, { id: 'p2', nombre: 'Té', sku: 'TE-1', unidad_medida: 'unidad', precio_compra: 10 }),
    ]);

    assert.equal(reporte.items.length, 2);
    // Café: 5 unidades * 6 = 30; Té: 1 * 10 = 10; ordenado por costo desc.
    assert.equal(reporte.items[0].producto_id, 'p1');
    assert.equal(reporte.items[0].unidades, 5);
    assert.equal(reporte.items[0].unidadesDanado, 2);
    assert.equal(reporte.items[0].unidadesPerdido, 3);
    assert.equal(reporte.items[0].costo, 30);

    assert.equal(reporte.totales.unidadesDanado, 3);
    assert.equal(reporte.totales.unidadesPerdido, 3);
    assert.equal(reporte.totales.costoDanado, 22);
    assert.equal(reporte.totales.costoPerdido, 18);
    assert.equal(reporte.totales.costo, 40);
    assert.equal(reporte.totales.operaciones, 3);
  });

  it('ignora salidas sin producto y tolera cantidades como texto', () => {
    const reporte = agregarMermas([
      salida('DANADO', 1, null),
      { motivo: 'PERDIDO', cantidad: '2,5', producto: { id: 'p1', nombre: 'Café', sku: 'CAF-1', unidad_medida: 'kg', precio_compra: '4' } },
    ]);

    assert.equal(reporte.items.length, 1);
    assert.equal(reporte.items[0].unidades, 2.5);
    assert.equal(reporte.items[0].costo, 10);
  });

  it('devuelve totales en cero sin mermas', () => {
    const reporte = agregarMermas([]);
    assert.deepEqual(reporte.items, []);
    assert.equal(reporte.totales.costo, 0);
    assert.equal(reporte.totales.operaciones, 0);
  });
});
