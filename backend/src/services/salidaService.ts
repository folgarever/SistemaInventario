import { supabase } from '../config/supabase';
import { MOTIVOS_SALIDA, SalidaDTO, SalidaPublica, ResultadoSalida } from '../types/salida';
import { ResultadoPaginado } from '../types/common';
import { Paginacion } from '../utils/pagination';
import { sanitizeFilterValue } from '../utils/sanitize';
import { crearError, mapearErrorBd, mapearErrorRpc } from '../utils/errors';

const CAMPOS_LISTADO = '*, producto:productos(id, nombre, sku, unidad_medida)';

export interface ListarSalidasOpciones {
  productoId?: string;
  motivo?: string;
  desde?: string;
  hasta?: string;
  paginacion?: Paginacion | null;
}

export class SalidaService {
  static async registrar(userId: string, dto: SalidaDTO): Promise<ResultadoSalida> {
    const producto_id = dto.producto_id?.trim();
    if (!producto_id) {
      throw crearError('Debe seleccionar un producto');
    }

    const cantidad = typeof dto.cantidad === 'number'
      ? dto.cantidad
      : Number(String(dto.cantidad ?? '').replace(',', '.'));
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw crearError('La cantidad debe ser mayor a 0');
    }

    const motivo = String(dto.motivo ?? '').trim().toUpperCase();
    if (!MOTIVOS_SALIDA.includes(motivo as (typeof MOTIVOS_SALIDA)[number])) {
      throw crearError('El motivo de la salida no es válido');
    }

    const { data, error } = await supabase.rpc('registrar_salida_transaccional', {
      p_user_id: userId,
      p_producto_id: producto_id,
      p_cantidad: cantidad,
      p_motivo: motivo,
      p_observaciones: dto.observaciones?.trim() || null,
      p_client_request_id: dto.client_request_id?.trim() || null,
      p_fecha: dto.fecha || null,
    });

    if (error) {
      throw mapearErrorRpc(error);
    }

    return data as ResultadoSalida;
  }

  static async listar(
    userId: string,
    opciones: ListarSalidasOpciones
  ): Promise<ResultadoPaginado<SalidaPublica>> {
    let query = supabase
      .from('salidas_inventario')
      .select(CAMPOS_LISTADO, { count: 'exact' })
      .eq('user_id', userId);

    if (opciones.productoId) {
      query = query.eq('producto_id', sanitizeFilterValue(opciones.productoId));
    }
    if (opciones.motivo) {
      query = query.eq('motivo', sanitizeFilterValue(opciones.motivo).toUpperCase());
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
      throw mapearErrorBd(error, 'Error al listar salidas');
    }

    const items = (data as SalidaPublica[]) ?? [];
    return {
      items,
      total: count ?? items.length,
      page: opciones.paginacion?.page ?? 1,
      limit: opciones.paginacion?.limit ?? items.length,
    };
  }

  static async obtener(userId: string, id: string): Promise<SalidaPublica> {
    const { data, error } = await supabase
      .from('salidas_inventario')
      .select(CAMPOS_LISTADO)
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw mapearErrorBd(error, 'Error al consultar la salida');
    }
    if (!data) {
      throw crearError('Salida no encontrada', 404);
    }
    return data as SalidaPublica;
  }
}
