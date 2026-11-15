import { supabase } from '../config/supabase';
import { MOTIVOS_AJUSTE, AjusteDTO, AjustePublico, ResultadoAjuste } from '../types/ajuste';
import { ResultadoPaginado } from '../types/common';
import { Paginacion } from '../utils/pagination';
import { sanitizeFilterValue } from '../utils/sanitize';
import { crearError, mapearErrorBd, mapearErrorRpc } from '../utils/errors';

const CAMPOS_LISTADO = '*, producto:productos(id, nombre, sku, unidad_medida)';

export interface ListarAjustesOpciones {
  productoId?: string;
  motivo?: string;
  desde?: string;
  hasta?: string;
  paginacion?: Paginacion | null;
}

export class AjusteService {
  static async registrar(userId: string, dto: AjusteDTO): Promise<ResultadoAjuste> {
    const producto_id = dto.producto_id?.trim();
    if (!producto_id) {
      throw crearError('Debe seleccionar un producto');
    }

    const existencias = typeof dto.existencias_fisicas === 'number'
      ? dto.existencias_fisicas
      : Number(String(dto.existencias_fisicas ?? '').replace(',', '.'));
    if (!Number.isFinite(existencias) || existencias < 0) {
      throw crearError('Las existencias físicas no pueden ser negativas');
    }

    const motivo = String(dto.motivo ?? '').trim().toUpperCase();
    if (!MOTIVOS_AJUSTE.includes(motivo as (typeof MOTIVOS_AJUSTE)[number])) {
      throw crearError('El motivo del ajuste no es válido');
    }

    const { data, error } = await supabase.rpc('registrar_ajuste_transaccional', {
      p_user_id: userId,
      p_producto_id: producto_id,
      p_existencias_fisicas: existencias,
      p_motivo: motivo,
      p_observaciones: dto.observaciones?.trim() || null,
      p_client_request_id: dto.client_request_id?.trim() || null,
      p_fecha: dto.fecha || null,
    });

    if (error) {
      throw mapearErrorRpc(error);
    }

    return data as ResultadoAjuste;
  }

  static async listar(
    userId: string,
    opciones: ListarAjustesOpciones
  ): Promise<ResultadoPaginado<AjustePublico>> {
    let query = supabase
      .from('ajustes_inventario')
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
      throw mapearErrorBd(error, 'Error al listar ajustes');
    }

    const items = (data as AjustePublico[]) ?? [];
    return {
      items,
      total: count ?? items.length,
      page: opciones.paginacion?.page ?? 1,
      limit: opciones.paginacion?.limit ?? items.length,
    };
  }

  static async obtener(userId: string, id: string): Promise<AjustePublico> {
    const { data, error } = await supabase
      .from('ajustes_inventario')
      .select(CAMPOS_LISTADO)
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw mapearErrorBd(error, 'Error al consultar el ajuste');
    }
    if (!data) {
      throw crearError('Ajuste no encontrado', 404);
    }
    return data as AjustePublico;
  }
}
