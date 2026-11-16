import { supabase } from '../config/supabase';
import {
  AlertaStock,
  AlertasDashboard,
  FlujoDashboard,
  ResumenDashboard,
  TotalesDashboard,
} from '../types/dashboard';
import { MovimientoPublico } from '../types/movimiento';
import { mapearErrorBd } from '../utils/errors';
import { MovimientoService } from './movimientoService';

const CAMPOS_PRODUCTO =
  'id, nombre, sku, unidad_medida, stock, stock_minimo, precio_compra, precio_venta, categoria:categorias(id, nombre)';

interface ProductoParaCalculo {
  id: string;
  nombre: string;
  sku: string;
  unidad_medida: string;
  stock: number | string;
  stock_minimo: number | string;
  precio_compra: number | string;
  precio_venta: number | string;
  categoria?: { id: string; nombre: string } | null;
}

function aNumero(valor: number | string | null | undefined): number {
  const n = typeof valor === 'number' ? valor : Number(String(valor ?? '0').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

export class DashboardService {
  // Cuenta los registros de una tabla para el usuario.
  private static async contar(
    tabla: string,
    userId: string,
    filtroActivo = false
  ): Promise<number> {
    let query = supabase.from(tabla).select('id', { count: 'exact', head: true }).eq('user_id', userId);
    if (filtroActivo) {
      query = query.eq('activo', true);
    }
    const { count, error } = await query;
    if (error) {
      throw mapearErrorBd(error, `Error al contar ${tabla}`);
    }
    return count ?? 0;
  }

  // Obtiene los productos activos del usuario con los campos necesarios para
  // calcular el valor del inventario y las alertas de stock.
  private static async productosActivos(userId: string): Promise<ProductoParaCalculo[]> {
    const { data, error } = await supabase
      .from('productos')
      .select(CAMPOS_PRODUCTO)
      .eq('user_id', userId)
      .eq('activo', true);

    if (error) {
      throw mapearErrorBd(error, 'Error al consultar los productos');
    }
    return (data as unknown as ProductoParaCalculo[]) ?? [];
  }

  // Genera la lista de alertas (agotados y bajo stock) ordenada por severidad:
  // primero los agotados y luego por mayor faltante respecto al minimo.
  private static construirAlertas(productos: ProductoParaCalculo[]): AlertasDashboard {
    const items: AlertaStock[] = [];

    for (const p of productos) {
      const stock = aNumero(p.stock);
      const minimo = aNumero(p.stock_minimo);
      if (stock > minimo) {
        continue;
      }
      items.push({
        id: p.id,
        nombre: p.nombre,
        sku: p.sku,
        unidad_medida: p.unidad_medida,
        stock,
        stock_minimo: minimo,
        faltante: redondear(Math.max(0, minimo - stock)),
        estado: stock <= 0 ? 'AGOTADO' : 'BAJO',
        categoria: p.categoria ?? null,
      });
    }

    items.sort((a, b) => {
      if (a.estado !== b.estado) {
        return a.estado === 'AGOTADO' ? -1 : 1;
      }
      return b.faltante - a.faltante;
    });

    const agotados = items.filter((i) => i.estado === 'AGOTADO').length;
    const bajoStock = items.filter((i) => i.estado === 'BAJO').length;

    return { agotados, bajoStock, total: items.length, items };
  }

  // Lista de alertas de stock (usada por el modulo de alertas).
  static async alertas(userId: string): Promise<AlertasDashboard> {
    const productos = await this.productosActivos(userId);
    return this.construirAlertas(productos);
  }

  // Resume el flujo de inventario: cantidad de operaciones y unidades que
  // entraron o salieron. Permite visualizar el proceso en el panel principal.
  private static async flujo(userId: string): Promise<FlujoDashboard> {
    const { data, error } = await supabase
      .from('movimientos_inventario')
      .select('tipo, cantidad')
      .eq('user_id', userId);

    if (error) {
      throw mapearErrorBd(error, 'Error al calcular el flujo de inventario');
    }

    let entradas = 0;
    let salidas = 0;
    let ajustes = 0;
    let unidadesEntrada = 0;
    let unidadesSalida = 0;

    for (const m of (data ?? []) as { tipo: string; cantidad: number | string }[]) {
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
      entradas,
      salidas,
      ajustes,
      unidadesEntrada: redondear(unidadesEntrada),
      unidadesSalida: redondear(unidadesSalida),
    };
  }

  // Resumen completo para el panel principal.
  static async resumen(userId: string): Promise<ResumenDashboard> {
    const [productos, totalCategorias, totalProveedores, totalMovimientos, flujo] = await Promise.all([
      this.productosActivos(userId),
      this.contar('categorias', userId),
      this.contar('proveedores', userId),
      this.contar('movimientos_inventario', userId),
      this.flujo(userId),
    ]);

    let unidades = 0;
    let valorCompra = 0;
    let valorVenta = 0;
    for (const p of productos) {
      const stock = aNumero(p.stock);
      unidades += stock;
      valorCompra += stock * aNumero(p.precio_compra);
      valorVenta += stock * aNumero(p.precio_venta);
    }

    const alertas = this.construirAlertas(productos);

    const recientes = await MovimientoService.listar(userId, {
      paginacion: { page: 1, limit: 8, offset: 0 },
    });

    const totales: TotalesDashboard = {
      productos: productos.length,
      categorias: totalCategorias,
      proveedores: totalProveedores,
      movimientos: totalMovimientos,
    };

    return {
      totales,
      inventario: {
        unidades: redondear(unidades),
        valorCompra: redondear(valorCompra),
        valorVenta: redondear(valorVenta),
      },
      alertas,
      flujo,
      movimientosRecientes: recientes.items as MovimientoPublico[],
    };
  }
}
