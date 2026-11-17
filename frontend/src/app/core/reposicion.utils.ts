// Utilidades para la lista de reposicion (compra). A partir del stock actual y
// el stock minimo de cada producto se calcula cuanto conviene reponer para
// volver a un nivel objetivo.

import { ReporteInventarioItem } from '../models';
import { numero } from './formato.utils';

// Nivel objetivo como multiplo del stock minimo. Reponer hasta el doble del
// minimo deja un margen de seguridad para las proximas ventas.
const FACTOR_OBJETIVO = 2;

function redondear(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// Cantidad sugerida a reponer. Es 0 cuando el producto ya esta por encima del
// nivel objetivo. Si esta agotado y no tiene minimo definido, sugiere al menos
// una unidad para no dejarlo fuera de la lista.
export function cantidadSugerida(
  stock: number | string | null | undefined,
  stockMinimo: number | string | null | undefined,
): number {
  const s = numero(stock);
  const minimo = numero(stockMinimo);
  let sugerido = minimo * FACTOR_OBJETIVO - s;
  if (sugerido <= 0 && s <= 0) {
    sugerido = 1;
  }
  return sugerido > 0 ? redondear(sugerido) : 0;
}

export interface ItemReposicion {
  id: string;
  nombre: string;
  sku: string;
  unidad_medida: string;
  categoria: string | null;
  proveedor: string | null;
  stock: number;
  stock_minimo: number;
  precio_compra: number;
  sugerido: number;
  costo_estimado: number;
}

export interface ListaReposicion {
  items: ItemReposicion[];
  totales: {
    productos: number;
    agotados: number;
    bajoStock: number;
    costoEstimado: number;
  };
}

// Construye la lista de reposicion a partir de los productos que llegan del
// reporte de inventario (normalmente ya filtrados por bajo stock y agotados).
export function construirListaReposicion(items: ReporteInventarioItem[]): ListaReposicion {
  const filas: ItemReposicion[] = [];
  let agotados = 0;
  let bajoStock = 0;
  let costoEstimado = 0;

  for (const item of items) {
    const stock = numero(item.stock);
    const stockMinimo = numero(item.stock_minimo);
    const precioCompra = numero(item.precio_compra);
    const sugerido = cantidadSugerida(stock, stockMinimo);
    const costo = redondear(sugerido * precioCompra);

    if (stock <= 0) {
      agotados += 1;
    } else if (stock <= stockMinimo) {
      bajoStock += 1;
    } else {
      // Producto disponible: no forma parte de la lista de reposicion.
      continue;
    }

    costoEstimado += costo;
    filas.push({
      id: item.id,
      nombre: item.nombre,
      sku: item.sku,
      unidad_medida: item.unidad_medida,
      categoria: item.categoria,
      proveedor: item.proveedor,
      stock,
      stock_minimo: stockMinimo,
      precio_compra: precioCompra,
      sugerido,
      costo_estimado: costo,
    });
  }

  filas.sort((a, b) => {
    const proveedorA = a.proveedor ?? '';
    const proveedorB = b.proveedor ?? '';
    if (proveedorA !== proveedorB) return proveedorA.localeCompare(proveedorB);
    return a.nombre.localeCompare(b.nombre);
  });

  return {
    items: filas,
    totales: {
      productos: filas.length,
      agotados,
      bajoStock,
      costoEstimado: redondear(costoEstimado),
    },
  };
}

export interface GrupoProveedor {
  proveedor: string;
  items: ItemReposicion[];
}

// Agrupa los productos de la lista por proveedor para la version impresa.
// Los productos sin proveedor se agrupan al final.
export function agruparPorProveedor(items: ItemReposicion[]): GrupoProveedor[] {
  const grupos = new Map<string, ItemReposicion[]>();

  for (const item of items) {
    const clave = item.proveedor?.trim() || 'Sin proveedor';
    const lista = grupos.get(clave);
    if (lista) {
      lista.push(item);
    } else {
      grupos.set(clave, [item]);
    }
  }

  return Array.from(grupos.entries())
    .map(([proveedor, filas]) => ({ proveedor, items: filas }))
    .sort((a, b) => {
      if (a.proveedor === 'Sin proveedor') return 1;
      if (b.proveedor === 'Sin proveedor') return -1;
      return a.proveedor.localeCompare(b.proveedor);
    });
}
