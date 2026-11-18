// Ordenamiento y filtros de la lista de productos. Se mantiene aparte del
// componente para poder probarlo y reutilizarlo (tabla y exportacion a PDF).
import { Producto } from '../models';
import { EstadoStock, estadoStock, ganancia, numero } from './formato.utils';

// Columnas por las que se puede ordenar la tabla de productos.
export type ColumnaProducto =
  | 'sku'
  | 'nombre'
  | 'categoria'
  | 'precio_compra'
  | 'precio_venta'
  | 'ganancia'
  | 'stock'
  | 'estado';

export type DireccionOrden = 'asc' | 'desc';

export interface OrdenProducto {
  columna: ColumnaProducto;
  direccion: DireccionOrden;
}

// Orden por defecto: nombre ascendente, igual que la consulta del backend.
export const ORDEN_PRODUCTO_INICIAL: OrdenProducto = { columna: 'nombre', direccion: 'asc' };

// Prioridad de los estados para poder ordenarlos (primero lo mas urgente).
const PESO_ESTADO: Record<EstadoStock, number> = { agotado: 0, bajo: 1, disponible: 2 };

function compararTexto(a: string, b: string): number {
  return a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' });
}

// Valor comparable de un producto segun la columna elegida.
export function valorOrden(producto: Producto, columna: ColumnaProducto): string | number {
  switch (columna) {
    case 'sku':
      return producto.sku ?? '';
    case 'nombre':
      return producto.nombre ?? '';
    case 'categoria':
      return producto.categoria?.nombre ?? '';
    case 'precio_compra':
      return numero(producto.precio_compra);
    case 'precio_venta':
      return numero(producto.precio_venta);
    case 'ganancia':
      return ganancia(producto.precio_venta, producto.precio_compra);
    case 'stock':
      return numero(producto.stock);
    case 'estado':
      return PESO_ESTADO[estadoStock(producto.stock, producto.stock_minimo)];
  }
}

export function compararProductos(a: Producto, b: Producto, columna: ColumnaProducto): number {
  const va = valorOrden(a, columna);
  const vb = valorOrden(b, columna);
  if (typeof va === 'number' && typeof vb === 'number') {
    return va - vb;
  }
  return compararTexto(String(va), String(vb));
}

// Devuelve una copia ordenada; no modifica el arreglo original.
export function ordenarProductos(productos: Producto[], orden: OrdenProducto): Producto[] {
  const factor = orden.direccion === 'asc' ? 1 : -1;
  return [...productos].sort((a, b) => factor * compararProductos(a, b, orden.columna));
}

// Alterna la direccion si se vuelve a pulsar la misma columna.
export function alternarOrden(orden: OrdenProducto, columna: ColumnaProducto): OrdenProducto {
  if (orden.columna === columna) {
    return { columna, direccion: orden.direccion === 'asc' ? 'desc' : 'asc' };
  }
  return { columna, direccion: 'asc' };
}

// Flecha que indica la columna y direccion activas (vacio si no lo esta).
export function indicadorOrden(orden: OrdenProducto, columna: ColumnaProducto): string {
  if (orden.columna !== columna) return '';
  return orden.direccion === 'asc' ? '↑' : '↓';
}

// Valor de aria-sort para el encabezado de la columna.
export function ariaOrden(
  orden: OrdenProducto,
  columna: ColumnaProducto,
): 'ascending' | 'descending' | 'none' {
  if (orden.columna !== columna) return 'none';
  return orden.direccion === 'asc' ? 'ascending' : 'descending';
}
