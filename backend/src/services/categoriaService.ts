import { supabase } from '../config/supabase';
import { CategoriaDTO, CategoriaPublica } from '../types/categoria';
import { ResultadoPaginado } from '../types/common';
import { Paginacion } from '../utils/pagination';
import { sanitizeSearchTerm } from '../utils/sanitize';
import { crearError, mapearErrorBd } from '../utils/errors';

const MAX_NOMBRE = 80;
const MAX_DESCRIPCION = 500;

export interface ListarCategoriasOpciones {
  buscar?: string;
  incluirInactivos?: boolean;
  paginacion?: Paginacion | null;
}

export class CategoriaService {
  private static validar(dto: CategoriaDTO): { nombre: string; descripcion: string | null } {
    const nombre = dto.nombre?.trim();
    if (!nombre) {
      throw crearError('El nombre de la categoría es obligatorio');
    }
    if (nombre.length > MAX_NOMBRE) {
      throw crearError(`El nombre no puede superar los ${MAX_NOMBRE} caracteres`);
    }

    const descripcion = dto.descripcion?.trim() || null;
    if (descripcion && descripcion.length > MAX_DESCRIPCION) {
      throw crearError(`La descripción no puede superar los ${MAX_DESCRIPCION} caracteres`);
    }

    return { nombre, descripcion };
  }

  static async listar(
    userId: string,
    opciones: ListarCategoriasOpciones
  ): Promise<ResultadoPaginado<CategoriaPublica>> {
    let query = supabase
      .from('categorias')
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
      throw mapearErrorBd(error, 'Error al listar categorías');
    }

    return {
      items: (data as CategoriaPublica[]) ?? [],
      total: count ?? (data?.length ?? 0),
      page: opciones.paginacion?.page ?? 1,
      limit: opciones.paginacion?.limit ?? (data?.length ?? 0),
    };
  }

  static async obtener(userId: string, id: string): Promise<CategoriaPublica> {
    const { data, error } = await supabase
      .from('categorias')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw mapearErrorBd(error, 'Error al consultar la categoría');
    }
    if (!data) {
      throw crearError('Categoría no encontrada', 404);
    }
    return data as CategoriaPublica;
  }

  static async crear(userId: string, dto: CategoriaDTO): Promise<CategoriaPublica> {
    const { nombre, descripcion } = this.validar(dto);

    const { data, error } = await supabase
      .from('categorias')
      .insert({ user_id: userId, nombre, descripcion })
      .select('*')
      .single();

    if (error || !data) {
      throw mapearErrorBd(error, 'Ya existe una categoría con ese nombre');
    }
    return data as CategoriaPublica;
  }

  static async actualizar(
    userId: string,
    id: string,
    dto: CategoriaDTO
  ): Promise<CategoriaPublica> {
    await this.obtener(userId, id);
    const { nombre, descripcion } = this.validar(dto);

    const { data, error } = await supabase
      .from('categorias')
      .update({ nombre, descripcion })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error || !data) {
      throw mapearErrorBd(error, 'Ya existe una categoría con ese nombre');
    }
    return data as CategoriaPublica;
  }

  static async cambiarEstado(
    userId: string,
    id: string,
    activo: boolean
  ): Promise<CategoriaPublica> {
    await this.obtener(userId, id);

    const { data, error } = await supabase
      .from('categorias')
      .update({ activo })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error || !data) {
      throw mapearErrorBd(error, 'Error al cambiar el estado de la categoría');
    }
    return data as CategoriaPublica;
  }

  static async eliminar(userId: string, id: string): Promise<void> {
    await this.obtener(userId, id);

    const { error } = await supabase.from('categorias').delete().eq('id', id).eq('user_id', userId);

    if (error) {
      throw mapearErrorBd(
        error,
        'No se pudo eliminar la categoría',
        'No se puede eliminar: hay productos asociados a esta categoría. Desactívela en su lugar.'
      );
    }
  }
}
