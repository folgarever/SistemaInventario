import { ReporteMermas, ReporteMermasItem } from '../types/reporte';
import { aNumero, redondear } from './numeros';

// Motivos de salida que representan una perdida de mercaderia (merma).
export const MOTIVOS_MERMA = ['DANADO', 'PERDIDO'] as const;
export type MotivoMerma = (typeof MOTIVOS_MERMA)[number];

export interface SalidaParaMerma {
  cantidad: number | string;
  motivo: string;
  producto?: {
    id: string;
    nombre: string;
    sku: string;
    unidad_medida: string;
    precio_compra: number | string;
  } | null;
}

// Agrupa las salidas por producto y calcula la perdida estimada usando el
// costo actual de cada producto (la tabla de salidas no guarda el costo del
// momento, igual que en el reporte de ventas).
export function agregarMermas(salidas: SalidaParaMerma[]): ReporteMermas {
  const porProducto = new Map<string, ReporteMermasItem>();

  let operaciones = 0;
  let unidades = 0;
  let costo = 0;
  let unidadesDanado = 0;
  let unidadesPerdido = 0;
  let costoDanado = 0;
  let costoPerdido = 0;

  for (const salida of salidas) {
    const p = salida.producto;
    if (!p) continue;

    const esDanado = salida.motivo === 'DANADO';
    const esPerdido = salida.motivo === 'PERDIDO';
    if (!esDanado && !esPerdido) continue;

    const cantidad = aNumero(salida.cantidad);
    const precioCompra = aNumero(p.precio_compra);
    const costoLinea = cantidad * precioCompra;

    operaciones += 1;
    unidades += cantidad;
    costo += costoLinea;
    if (esDanado) {
      unidadesDanado += cantidad;
      costoDanado += costoLinea;
    } else {
      unidadesPerdido += cantidad;
      costoPerdido += costoLinea;
    }

    let item = porProducto.get(p.id);
    if (!item) {
      item = {
        producto_id: p.id,
        nombre: p.nombre,
        sku: p.sku,
        unidad_medida: p.unidad_medida,
        precio_compra: precioCompra,
        unidades: 0,
        unidadesDanado: 0,
        unidadesPerdido: 0,
        costo: 0,
      };
      porProducto.set(p.id, item);
    }
    item.unidades += cantidad;
    item.costo += costoLinea;
    if (esDanado) {
      item.unidadesDanado += cantidad;
    } else {
      item.unidadesPerdido += cantidad;
    }
  }

  const items = Array.from(porProducto.values())
    .map((item) => {
      item.unidades = redondear(item.unidades);
      item.unidadesDanado = redondear(item.unidadesDanado);
      item.unidadesPerdido = redondear(item.unidadesPerdido);
      item.costo = redondear(item.costo);
      return item;
    })
    .sort((a, b) => b.costo - a.costo);

  return {
    items,
    totales: {
      operaciones,
      unidades: redondear(unidades),
      costo: redondear(costo),
      unidadesDanado: redondear(unidadesDanado),
      unidadesPerdido: redondear(unidadesPerdido),
      costoDanado: redondear(costoDanado),
      costoPerdido: redondear(costoPerdido),
    },
  };
}
