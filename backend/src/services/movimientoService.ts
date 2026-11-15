import { supabase } from '../config/supabase';
import { TIPOS_MOVIMIENTO, MovimientoPublico } from '../types/movimiento';
import { ResultadoPaginado } from '../types/common';
import { Paginacion } from '../utils/pagination';
import { sanitizeFilterValue } from '../utils/sanitize';
import { crearError, mapearErrorBd } from '../utils/errors';

const CAMPOS_LISTADO = '*, producto:productos(id, nombre, sku, unidad_medida)';

export interface ListarMovimientosOpciones {
  productoId?: string;
  tipo?: string;
  desde?: string;
  hasta?: string;
  paginacion?: Paginacion | null;
}

export class MovimientoService {
  static async listar(
    userId: string,
    opciones: ListarMovimientosOpciones
  ): Promise<ResultadoPaginado<MovimientoPublico>> {
    let query = supabase
      .from('movimientos_inventario')
      .select(CAMPOS_LISTADO, { count: 'exact' })
      .eq('user_id', userId);

    if (opciones.productoId) {
      query = query.eq('producto_id', sanitizeFilterValue(opciones.productoId));
    }
    if (opciones.tipo) {
      query = query.eq('tipo', sanitizeFilterValue(opciones.tipo).toUpperCase());
    }
    if (opciones.desde) {
      query = query.gte('fecha', opciones.desde);
    }
    if (opciones.hasta) {
      query = query.lte('fecha', opciones.hasta);
    }

    query = query.order('fecha', { ascending: false });

    if (opciones.paginacion) {
      const { offset, limit } = opciones.paginacion;
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await query;
    if (error) {
      throw mapearErrorBd(error, 'Error al listar movimientos');
    }

    const items = (data as MovimientoPublico[]) ?? [];
    return {
      items,
      total: count ?? items.length,
      page: opciones.paginacion?.page ?? 1,
      limit: opciones.paginacion?.limit ?? items.length,
    };
  }

  static validarTipo(tipo?: string): string | undefined {
    if (!tipo) return undefined;
    const normalizado = tipo.toUpperCase();
    if (!TIPOS_MOVIMIENTO.includes(normalizado as (typeof TIPOS_MOVIMIENTO)[number])) {
      throw crearError('Tipo de movimiento no válido');
    }
    return normalizado;
  }
}
