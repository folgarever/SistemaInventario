import { ReporteRotacion, ReporteRotacionItem } from '../types/reporte';
import { aNumero, redondear } from './numeros';

export interface ProductoParaRotacion {
  id: string;
  nombre: string;
  sku: string;
  unidad_medida: string;
  stock: number | string;
  precio_venta: number | string;
  categoria?: { nombre: string } | null;
}

export interface SalidaParaRotacion {
  cantidad: number | string;
  fecha: string;
  producto_id: string;
}

// Cruza el catalogo de productos con las ventas del periodo para obtener la
// rotacion de cada articulo. Los productos sin ventas en el periodo quedan
// marcados como "sin movimiento".
export function agregarRotacion(
  productos: ProductoParaRotacion[],
  salidas: SalidaParaRotacion[]
): ReporteRotacion {
  const porProducto = new Map<string, { unidades: number; ultimaVenta: string | null }>();

  for (const salida of salidas) {
    const actual = porProducto.get(salida.producto_id) ?? { unidades: 0, ultimaVenta: null };
    actual.unidades += aNumero(salida.cantidad);
    if (!actual.ultimaVenta || salida.fecha > actual.ultimaVenta) {
      actual.ultimaVenta = salida.fecha;
    }
    porProducto.set(salida.producto_id, actual);
  }

  const items: ReporteRotacionItem[] = productos.map((p) => {
    const venta = porProducto.get(p.id);
    const unidadesVendidas = redondear(venta?.unidades ?? 0);
    const precioVenta = aNumero(p.precio_venta);

    return {
      producto_id: p.id,
      nombre: p.nombre,
      sku: p.sku,
      unidad_medida: p.unidad_medida,
      categoria: p.categoria?.nombre ?? null,
      stock: redondear(aNumero(p.stock)),
      unidadesVendidas,
      ingreso: redondear(unidadesVendidas * precioVenta),
      ultimaVenta: venta?.ultimaVenta ?? null,
      sinMovimiento: unidadesVendidas <= 0,
    };
  });

  items.sort((a, b) => b.unidadesVendidas - a.unidadesVendidas || a.nombre.localeCompare(b.nombre));

  let conMovimiento = 0;
  let sinMovimiento = 0;
  let unidades = 0;
  let ingreso = 0;

  for (const item of items) {
    if (item.sinMovimiento) {
      sinMovimiento += 1;
    } else {
      conMovimiento += 1;
    }
    unidades += item.unidadesVendidas;
    ingreso += item.ingreso;
  }

  return {
    items,
    totales: {
      productos: items.length,
      conMovimiento,
      sinMovimiento,
      unidades: redondear(unidades),
      ingreso: redondear(ingreso),
    },
  };
}
