import { supabase } from '../config/supabase';
import {
  ReporteInventario,
  ReporteInventarioItem,
  ReporteMovimientos,
  ReporteVentas,
  ReporteVentasItem,
} from '../types/reporte';
import { MovimientoPublico } from '../types/movimiento';
import { sanitizeFilterValue } from '../utils/sanitize';
import { mapearErrorBd } from '../utils/errors';
import { MovimientoService } from './movimientoService';

const CAMPOS_INVENTARIO =
  'id, nombre, sku, unidad_medida, stock, stock_minimo, precio_compra, precio_venta, categoria:categorias(nombre), proveedor:proveedores(nombre)';

interface ProductoInventario {
  id: string;
  nombre: string;
  sku: string;
  unidad_medida: string;
  stock: number | string;
  stock_minimo: number | string;
  precio_compra: number | string;
  precio_venta: number | string;
  categoria?: { nombre: string } | null;
  proveedor?: { nombre: string } | null;
}

export interface FiltrosInventario {
  categoriaId?: string;
  proveedorId?: string;
  soloBajoStock?: boolean;
  incluirInactivos?: boolean;
}

export interface FiltrosMovimientos {
  desde?: string;
  hasta?: string;
  tipo?: string;
  productoId?: string;
}

export interface FiltrosVentas {
  desde?: string;
  hasta?: string;
  productoId?: string;
}

interface SalidaParaVenta {
  cantidad: number | string;
  fecha: string;
  producto?: {
    id: string;
    nombre: string;
    sku: string;
    unidad_medida: string;
    precio_venta: number | string;
    precio_compra: number | string;
  } | null;
}

function aNumero(valor: number | string | null | undefined): number {
  const n = typeof valor === 'number' ? valor : Number(String(valor ?? '0').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

export class ReporteService {
  // Reporte de inventario valorizado (a precio de compra y de venta).
  static async inventario(
    userId: string,
    filtros: FiltrosInventario
  ): Promise<ReporteInventario> {
    let query = supabase
      .from('productos')
      .select(CAMPOS_INVENTARIO)
      .eq('user_id', userId);

    if (!filtros.incluirInactivos) {
      query = query.eq('activo', true);
    }
    if (filtros.categoriaId) {
      query = query.eq('categoria_id', sanitizeFilterValue(filtros.categoriaId));
    }
    if (filtros.proveedorId) {
      query = query.eq('proveedor_id', sanitizeFilterValue(filtros.proveedorId));
    }

    query = query.order('nombre', { ascending: true });

    const { data, error } = await query;
    if (error) {
      throw mapearErrorBd(error, 'Error al generar el reporte de inventario');
    }

    const productos = (data as unknown as ProductoInventario[]) ?? [];
    const items: ReporteInventarioItem[] = [];
    let unidades = 0;
    let valorCompra = 0;
    let valorVenta = 0;
    let agotados = 0;
    let bajoStock = 0;

    for (const p of productos) {
      const stock = aNumero(p.stock);
      const minimo = aNumero(p.stock_minimo);
      const precioCompra = aNumero(p.precio_compra);
      const precioVenta = aNumero(p.precio_venta);
      const valorC = stock * precioCompra;
      const valorV = stock * precioVenta;

      let estado: ReporteInventarioItem['estado'] = 'DISPONIBLE';
      if (stock <= 0) {
        estado = 'AGOTADO';
        agotados += 1;
      } else if (stock <= minimo) {
        estado = 'BAJO';
        bajoStock += 1;
      }

      if (filtros.soloBajoStock && estado === 'DISPONIBLE') {
        continue;
      }

      unidades += stock;
      valorCompra += valorC;
      valorVenta += valorV;

      items.push({
        id: p.id,
        nombre: p.nombre,
        sku: p.sku,
        categoria: p.categoria?.nombre ?? null,
        proveedor: p.proveedor?.nombre ?? null,
        unidad_medida: p.unidad_medida,
        stock,
        stock_minimo: minimo,
        precio_compra: precioCompra,
        precio_venta: precioVenta,
        valor_compra: redondear(valorC),
        valor_venta: redondear(valorV),
        estado,
      });
    }

    return {
      items,
      totales: {
        productos: items.length,
        unidades: redondear(unidades),
        valorCompra: redondear(valorCompra),
        valorVenta: redondear(valorVenta),
        agotados,
        bajoStock,
      },
    };
  }

  // Reporte de movimientos (kardex) en un rango de fechas.
  static async movimientos(
    userId: string,
    filtros: FiltrosMovimientos
  ): Promise<ReporteMovimientos> {
    const resultado = await MovimientoService.listar(userId, {
      productoId: filtros.productoId,
      tipo: filtros.tipo,
      desde: filtros.desde,
      hasta: filtros.hasta,
      paginacion: null,
    });

    const items = resultado.items as MovimientoPublico[];
    let entradas = 0;
    let salidas = 0;
    let ajustes = 0;
    let unidadesEntrada = 0;
    let unidadesSalida = 0;

    for (const m of items) {
      const cantidad = aNumero(m.cantidad);
      if (m.tipo === 'ENTRADA') {
        entradas += 1;
        unidadesEntrada += cantidad;
      } else if (m.tipo === 'SALIDA') {
        salidas += 1;
        unidadesSalida += Math.abs(cantidad);
      } else {
        ajustes += 1;
      }
    }

    return {
      items,
      totales: {
        total: items.length,
        entradas,
        salidas,
        ajustes,
        unidadesEntrada: redondear(unidadesEntrada),
        unidadesSalida: redondear(unidadesSalida),
      },
    };
  }

  // Reporte de ventas y ganancia por producto en un rango de fechas.
  //
  // Nota: la tabla de salidas no conserva el precio aplicado en el momento de
  // la venta, por lo que el ingreso y la ganancia se calculan con los precios
  // actuales de cada producto. Es una estimacion util para la tienda, no un
  // cierre contable exacto.
  static async ventas(userId: string, filtros: FiltrosVentas): Promise<ReporteVentas> {
    let query = supabase
      .from('salidas_inventario')
      .select(
        'cantidad, fecha, producto:productos(id, nombre, sku, unidad_medida, precio_venta, precio_compra)'
      )
      .eq('user_id', userId)
      .eq('motivo', 'VENTA');

    if (filtros.productoId) {
      query = query.eq('producto_id', sanitizeFilterValue(filtros.productoId));
    }
    if (filtros.desde) {
      query = query.gte('fecha', filtros.desde);
    }
    if (filtros.hasta) {
      query = query.lte('fecha', filtros.hasta);
    }

    query = query.order('fecha', { ascending: false });

    const { data, error } = await query;
    if (error) {
      throw mapearErrorBd(error, 'Error al generar el reporte de ventas');
    }

    const salidas = (data as unknown as SalidaParaVenta[]) ?? [];
    const porProducto = new Map<string, ReporteVentasItem>();
    let operaciones = 0;

    for (const salida of salidas) {
      const p = salida.producto;
      if (!p) continue;

      const cantidad = aNumero(salida.cantidad);
      operaciones += 1;

      let item = porProducto.get(p.id);
      if (!item) {
        item = {
          producto_id: p.id,
          nombre: p.nombre,
          sku: p.sku,
          unidad_medida: p.unidad_medida,
          unidades: 0,
          precio_venta: aNumero(p.precio_venta),
          precio_compra: aNumero(p.precio_compra),
          ingreso: 0,
          costo: 0,
          ganancia: 0,
          margen: 0,
        };
        porProducto.set(p.id, item);
      }
      item.unidades += cantidad;
    }

    const items = Array.from(porProducto.values())
      .map((item) => {
        item.unidades = redondear(item.unidades);
        item.ingreso = redondear(item.unidades * item.precio_venta);
        item.costo = redondear(item.unidades * item.precio_compra);
        item.ganancia = redondear(item.ingreso - item.costo);
        item.margen = item.ingreso > 0 ? redondear((item.ganancia / item.ingreso) * 100) : 0;
        return item;
      })
      .sort((a, b) => b.ingreso - a.ingreso);

    let unidades = 0;
    let ingreso = 0;
    let costo = 0;
    for (const item of items) {
      unidades += item.unidades;
      ingreso += item.ingreso;
      costo += item.costo;
    }
    const ganancia = redondear(ingreso - costo);

    return {
      items,
      totales: {
        operaciones,
        unidades: redondear(unidades),
        ingreso: redondear(ingreso),
        costo: redondear(costo),
        ganancia,
        margen: ingreso > 0 ? redondear((ganancia / ingreso) * 100) : 0,
      },
    };
  }
}
