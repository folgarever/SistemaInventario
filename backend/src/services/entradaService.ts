import { supabase } from '../config/supabase';
import { EntradaDTO, EntradaPublica, ResultadoEntrada } from '../types/entrada';
import { ResultadoPaginado } from '../types/common';
import { Paginacion } from '../utils/pagination';
import { sanitizeFilterValue } from '../utils/sanitize';
import { crearError, mapearErrorBd, mapearErrorRpc } from '../utils/errors';

const CAMPOS_DETALLE =
  'id, entrada_id, producto_id, cantidad, costo_unitario, subtotal, ' +
  'producto:productos(id, nombre, sku, unidad_medida)';
const CAMPOS_LISTADO =
  `*, proveedor:proveedores(id, nombre), detalles:detalles_entrada(${CAMPOS_DETALLE})`;

export interface ListarEntradasOpciones {
  proveedorId?: string;
  desde?: string;
  hasta?: string;
  paginacion?: Paginacion | null;
}

function aNumeroPositivo(valor: number | string, campo: string): number {
  const n = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) {
    throw crearError(`El campo ${campo} debe ser un número mayor a 0`);
  }
  return n;
}

export class EntradaService {
  static async registrar(userId: string, dto: EntradaDTO): Promise<ResultadoEntrada> {
    if (!Array.isArray(dto.items) || dto.items.length === 0) {
      throw crearError('La entrada debe incluir al menos un producto');
    }

    const items = dto.items.map((item) => {
      const producto_id = item.producto_id?.trim();
      if (!producto_id) {
        throw crearError('Cada línea debe indicar un producto');
      }
      const cantidad = aNumeroPositivo(item.cantidad, 'cantidad');
      const costoUnitarioRaw =
        typeof item.costo_unitario === 'number'
          ? item.costo_unitario
          : Number(String(item.costo_unitario ?? '0').replace(',', '.'));
      if (!Number.isFinite(costoUnitarioRaw) || costoUnitarioRaw < 0) {
        throw crearError('El costo unitario no puede ser negativo');
      }
      return {
        producto_id,
        cantidad,
        costo_unitario: Math.round(costoUnitarioRaw * 100) / 100,
      };
    });

    const proveedor_id = dto.proveedor_id?.trim() || null;
    if (proveedor_id) {
      const { data } = await supabase
        .from('proveedores')
        .select('id')
        .eq('id', proveedor_id)
        .eq('user_id', userId)
        .maybeSingle();
      if (!data) {
        throw crearError('El proveedor seleccionado no existe', 400);
      }
    }

    const { data, error } = await supabase.rpc('registrar_entrada_transaccional', {
      p_user_id: userId,
      p_proveedor_id: proveedor_id,
      p_items: items,
      p_observaciones: dto.observaciones?.trim() || null,
      p_client_request_id: dto.client_request_id?.trim() || null,
      p_fecha: dto.fecha || null,
    });

    if (error) {
      throw mapearErrorRpc(error);
    }

    return data as ResultadoEntrada;
  }

  static async listar(
    userId: string,
    opciones: ListarEntradasOpciones
  ): Promise<ResultadoPaginado<EntradaPublica>> {
    let query = supabase
      .from('entradas_inventario')
      .select(CAMPOS_LISTADO, { count: 'exact' })
      .eq('user_id', userId);

    if (opciones.proveedorId) {
      query = query.eq('proveedor_id', sanitizeFilterValue(opciones.proveedorId));
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
      throw mapearErrorBd(error, 'Error al listar entradas');
    }

    const items = (data as EntradaPublica[]) ?? [];
    return {
      items,
      total: count ?? items.length,
      page: opciones.paginacion?.page ?? 1,
      limit: opciones.paginacion?.limit ?? items.length,
    };
  }

  static async obtener(userId: string, id: string): Promise<EntradaPublica> {
    const { data, error } = await supabase
      .from('entradas_inventario')
      .select(CAMPOS_LISTADO)
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw mapearErrorBd(error, 'Error al consultar la entrada');
    }
    if (!data) {
      throw crearError('Entrada no encontrada', 404);
    }
    return data as EntradaPublica;
  }
}
