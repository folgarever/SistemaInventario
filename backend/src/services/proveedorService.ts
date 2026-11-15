import { supabase } from '../config/supabase';
import { ProveedorDTO, ProveedorPublico } from '../types/proveedor';
import { ResultadoPaginado } from '../types/common';
import { Paginacion } from '../utils/pagination';
import { sanitizeSearchTerm } from '../utils/sanitize';
import { crearError, mapearErrorBd } from '../utils/errors';

const MAX_NOMBRE = 150;
const MAX_TEXTO = 150;
const MAX_OBSERVACIONES = 1000;

export interface ListarProveedoresOpciones {
  buscar?: string;
  incluirInactivos?: boolean;
  paginacion?: Paginacion | null;
}

export class ProveedorService {
  private static validar(dto: ProveedorDTO) {
    const nombre = dto.nombre?.trim();
    if (!nombre) {
      throw crearError('El nombre del proveedor es obligatorio');
    }
    if (nombre.length > MAX_NOMBRE) {
      throw crearError(`El nombre no puede superar los ${MAX_NOMBRE} caracteres`);
    }

    const email = dto.email?.trim().toLowerCase() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw crearError('El correo del proveedor no tiene un formato válido');
    }

    const recortar = (valor: string | null | undefined, max: number, campo: string): string | null => {
      const v = valor?.trim() || null;
      if (v && v.length > max) {
        throw crearError(`El campo ${campo} no puede superar los ${max} caracteres`);
      }
      return v;
    };

    return {
      nombre,
      contacto: recortar(dto.contacto, MAX_TEXTO, 'contacto'),
      telefono: recortar(dto.telefono, 30, 'teléfono'),
      email,
      direccion: recortar(dto.direccion, 200, 'dirección'),
      nit: recortar(dto.nit, 30, 'NIT'),
      observaciones: recortar(dto.observaciones, MAX_OBSERVACIONES, 'observaciones'),
    };
  }

  static async listar(
    userId: string,
    opciones: ListarProveedoresOpciones
  ): Promise<ResultadoPaginado<ProveedorPublico>> {
    let query = supabase
      .from('proveedores')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (!opciones.incluirInactivos) {
      query = query.eq('activo', true);
    }

    const termino = sanitizeSearchTerm(opciones.buscar);
    if (termino) {
      query = query.ilike('nombre', `%${termino}%`);
    }

    query = query.order('nombre', { ascending: true });

    if (opciones.paginacion) {
      const { offset, limit } = opciones.paginacion;
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await query;
    if (error) {
      throw mapearErrorBd(error, 'Error al listar proveedores');
    }

    return {
      items: (data as ProveedorPublico[]) ?? [],
      total: count ?? (data?.length ?? 0),
      page: opciones.paginacion?.page ?? 1,
      limit: opciones.paginacion?.limit ?? (data?.length ?? 0),
    };
  }

  static async obtener(userId: string, id: string): Promise<ProveedorPublico> {
    const { data, error } = await supabase
      .from('proveedores')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw mapearErrorBd(error, 'Error al consultar el proveedor');
    }
    if (!data) {
      throw crearError('Proveedor no encontrado', 404);
    }
    return data as ProveedorPublico;
  }

  static async crear(userId: string, dto: ProveedorDTO): Promise<ProveedorPublico> {
    const datos = this.validar(dto);

    const { data, error } = await supabase
      .from('proveedores')
      .insert({ user_id: userId, ...datos })
      .select('*')
      .single();

    if (error || !data) {
      throw mapearErrorBd(error, 'Error al crear el proveedor');
    }
    return data as ProveedorPublico;
  }

  static async actualizar(
    userId: string,
    id: string,
    dto: ProveedorDTO
  ): Promise<ProveedorPublico> {
    await this.obtener(userId, id);
    const datos = this.validar(dto);

    const { data, error } = await supabase
      .from('proveedores')
      .update(datos)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error || !data) {
      throw mapearErrorBd(error, 'Error al actualizar el proveedor');
    }
    return data as ProveedorPublico;
  }

  static async cambiarEstado(
    userId: string,
    id: string,
    activo: boolean
  ): Promise<ProveedorPublico> {
    await this.obtener(userId, id);

    const { data, error } = await supabase
      .from('proveedores')
      .update({ activo })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error || !data) {
      throw mapearErrorBd(error, 'Error al cambiar el estado del proveedor');
    }
    return data as ProveedorPublico;
  }

  static async eliminar(userId: string, id: string): Promise<void> {
    await this.obtener(userId, id);

    const { error } = await supabase.from('proveedores').delete().eq('id', id).eq('user_id', userId);

    if (error) {
      throw mapearErrorBd(
        error,
        'No se pudo eliminar el proveedor',
        'No se puede eliminar: hay productos o entradas asociadas a este proveedor. Desactívelo en su lugar.'
      );
    }
  }
}
