import { describe, expect, it } from 'vitest';
import { ItemReposicion } from './reposicion.utils';
import {
  ItemCompra,
  agruparCompras,
  claveManual,
  claveProducto,
  fusionarRecomendados,
  itemDesdeReposicion,
  itemsVisibles,
  totalesCompra,
} from './compras.utils';

function reposicion(parcial: Partial<ItemReposicion>): ItemReposicion {
  return {
    id: parcial.id ?? 'p1',
    nombre: parcial.nombre ?? 'Producto',
    sku: parcial.sku ?? 'SKU',
    unidad_medida: parcial.unidad_medida ?? 'unidad',
    categoria: parcial.categoria ?? null,
    proveedor: parcial.proveedor ?? null,
    stock: parcial.stock ?? 0,
    stock_minimo: parcial.stock_minimo ?? 0,
    precio_compra: parcial.precio_compra ?? 0,
    sugerido: parcial.sugerido ?? 1,
    costo_estimado: parcial.costo_estimado ?? 0,
    ...parcial,
  };
}

function item(parcial: Partial<ItemCompra>): ItemCompra {
  return {
    clave: parcial.clave ?? 'man:1',
    nombre: parcial.nombre ?? 'Articulo',
    sku: parcial.sku ?? null,
    unidad: parcial.unidad ?? 'unidad',
    cantidad: parcial.cantidad ?? 1,
    proveedor: parcial.proveedor ?? null,
    nota: parcial.nota ?? null,
    origen: parcial.origen ?? 'MANUAL',
    precioCompra: parcial.precioCompra ?? 0,
    comprado: parcial.comprado ?? false,
    editado: parcial.editado ?? false,
    descartado: parcial.descartado ?? false,
    ...parcial,
  };
}

describe('claves', () => {
  it('prefija la clave segun el origen', () => {
    expect(claveProducto('abc')).toBe('prod:abc');
    expect(claveManual('xyz')).toBe('man:xyz');
  });
});

describe('itemDesdeReposicion', () => {
  it('mapea la recomendacion a una linea de compra', () => {
    const linea = itemDesdeReposicion(
      reposicion({ id: 'p9', nombre: 'Arroz', sku: 'A-1', proveedor: 'Distri', sugerido: 4, precio_compra: 2.5 }),
    );
    expect(linea.clave).toBe('prod:p9');
    expect(linea.origen).toBe('RECOMENDADO');
    expect(linea.cantidad).toBe(4);
    expect(linea.precioCompra).toBe(2.5);
    expect(linea.comprado).toBe(false);
    expect(linea.descartado).toBe(false);
  });
});

describe('fusionarRecomendados', () => {
  it('agrega las recomendaciones nuevas y conserva los manuales', () => {
    const actuales = [item({ clave: 'man:1', origen: 'MANUAL', nombre: 'Bolsas' })];
    const nuevos = [item({ clave: 'prod:p1', origen: 'RECOMENDADO', nombre: 'Arroz' })];
    const fusion = fusionarRecomendados(actuales, nuevos);
    expect(fusion.map((i) => i.clave)).toEqual(['prod:p1', 'man:1']);
  });

  it('conserva cantidad, nota, marcado y descartado de una recomendacion vigente', () => {
    const actuales = [
      item({
        clave: 'prod:p1',
        origen: 'RECOMENDADO',
        cantidad: 9,
        editado: true,
        nota: 'del bueno',
        comprado: true,
        descartado: true,
      }),
    ];
    const nuevos = [item({ clave: 'prod:p1', origen: 'RECOMENDADO', cantidad: 4 })];
    const [fusion] = fusionarRecomendados(actuales, nuevos);
    expect(fusion.cantidad).toBe(9);
    expect(fusion.nota).toBe('del bueno');
    expect(fusion.comprado).toBe(true);
    expect(fusion.descartado).toBe(true);
  });

  it('actualiza la cantidad sugerida si el usuario no la edito', () => {
    const actuales = [item({ clave: 'prod:p1', origen: 'RECOMENDADO', cantidad: 4, editado: false })];
    const nuevos = [item({ clave: 'prod:p1', origen: 'RECOMENDADO', cantidad: 8 })];
    const [fusion] = fusionarRecomendados(actuales, nuevos);
    expect(fusion.cantidad).toBe(8);
  });

  it('quita las recomendaciones que ya no aplican', () => {
    const actuales = [item({ clave: 'prod:p1', origen: 'RECOMENDADO' })];
    const fusion = fusionarRecomendados(actuales, []);
    expect(fusion).toEqual([]);
  });
});

describe('itemsVisibles', () => {
  it('oculta los descartados', () => {
    const items = [item({ clave: 'a' }), item({ clave: 'b', descartado: true })];
    expect(itemsVisibles(items).map((i) => i.clave)).toEqual(['a']);
  });
});

describe('agruparCompras', () => {
  it('agrupa por proveedor y deja los sin proveedor al final', () => {
    const grupos = agruparCompras([
      item({ clave: 'a', nombre: 'A', proveedor: 'Zeta' }),
      item({ clave: 'b', nombre: 'B', proveedor: null }),
      item({ clave: 'c', nombre: 'C', proveedor: 'Alfa' }),
    ]);
    expect(grupos.map((g) => g.proveedor)).toEqual(['Alfa', 'Zeta', 'Sin proveedor']);
  });

  it('dentro del grupo pone primero los pendientes y ordena por nombre', () => {
    const grupos = agruparCompras([
      item({ clave: 'a', nombre: 'Zanahoria', proveedor: 'X' }),
      item({ clave: 'b', nombre: 'Arroz', proveedor: 'X', comprado: true }),
      item({ clave: 'c', nombre: 'Aceite', proveedor: 'X' }),
    ]);
    expect(grupos[0].items.map((i) => i.nombre)).toEqual(['Aceite', 'Zanahoria', 'Arroz']);
  });
});

describe('totalesCompra', () => {
  it('cuenta pendientes, comprados y el costo de lo pendiente', () => {
    const totales = totalesCompra([
      item({ clave: 'a', cantidad: 3, precioCompra: 2 }), // pendiente -> 6
      item({ clave: 'b', cantidad: 5, precioCompra: 10, comprado: true }), // comprado -> no cuenta
      item({ clave: 'c', cantidad: 1, precioCompra: 0.5 }), // pendiente -> 0.5
    ]);
    expect(totales.total).toBe(3);
    expect(totales.pendientes).toBe(2);
    expect(totales.comprados).toBe(1);
    expect(totales.unidadesPendientes).toBe(4);
    expect(totales.costoEstimado).toBeCloseTo(6.5);
  });

  it('con la lista vacia devuelve ceros', () => {
    expect(totalesCompra([])).toEqual({
      total: 0,
      pendientes: 0,
      comprados: 0,
      unidadesPendientes: 0,
      costoEstimado: 0,
    });
  });
});
