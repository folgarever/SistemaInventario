import { supabase } from '../config/supabase';
import { ProductoDTO, ProductoPublico } from '../types/producto';
import { ResultadoPaginado } from '../types/common';
import { Paginacion } from '../utils/pagination';
import { sanitizeFilterValue, sanitizeSearchTerm } from '../utils/sanitize';
import { crearError, mapearErrorBd } from '../utils/errors';

const MAX_NOMBRE = 150;
const MAX_SKU = 60;
const MAX_DESCRIPCION = 1000;
const MAX_UNIDAD = 30;
const CAMPOS_LISTADO =
  '*, categoria:categorias(id, nombre), proveedor:proveedores(id, nombre)';

export interface ListarProductosOpciones {
  buscar?: string;
  categoriaId?: string;
  proveedorId?: string;
  incluirInactivos?: boolean;
  soloBajoStock?: boolean;
  paginacion?: Paginacion | null;
}

function aNumero(valor: number | string | null | undefined, campo: string, minimo = 0): number {
  if (valor === null || valor === undefined || valor === '') {
    return 0;
  }
  const n = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  if (!Number.isFinite(n)) {
    throw crearError(`El campo ${campo} debe ser un número válido`);
  }
  if (n < minimo) {
    throw crearError(`El campo ${campo} no puede ser menor que ${minimo}`);
  }
  return Math.round(n * 100) / 100;
}

export class ProductoService {
  private static validar(dto: ProductoDTO) {
    const nombre = dto.nombre?.trim();
    if (!nombre) {
      throw crearError('El nombre del producto es obligatorio');
    }
    if (nombre.length > MAX_NOMBRE) {
      throw crearError(`El nombre no puede superar los ${MAX_NOMBRE} caracteres`);
    }

    const sku = dto.sku?.trim();
    if (!sku) {
      throw crearError('El SKU (código) del producto es obligatorio');
    }
    if (sku.length > MAX_SKU) {
      throw crearError(`El SKU no puede superar los ${MAX_SKU} caracteres`);
    }

    const unidad_medida = dto.unidad_medida?.trim() || 'unidad';
    if (unidad_medida.length > MAX_UNIDAD) {
      throw crearError(`La unidad de medida no puede superar los ${MAX_UNIDAD} caracteres`);
    }

    const descripcion = dto.descripcion?.trim() || null;
    if (descripcion && descripcion.length > MAX_DESCRIPCION) {
      throw crearError(`La descripción no puede superar los ${MAX_DESCRIPCION} caracteres`);
    }

    const imagen_url = dto.imagen_url?.trim() || null;

    return {
      nombre,
      sku,
      categoria_id: dto.categoria_id?.trim() || null,
      proveedor_id: dto.proveedor_id?.trim() || null,
      descripcion,
      precio_compra: aNumero(dto.precio_compra, 'precio de compra'),
      precio_venta: aNumero(dto.precio_venta, 'precio de venta'),
      stock_minimo: aNumero(dto.stock_minimo, 'stock mínimo'),
      unidad_medida,
      imagen_url,
    };
  }

  // Verifica que la categoria/proveedor existan y pertenezcan al usuario.
  private static async validarRelaciones(
    userId: string,
    categoriaId: string | null,
    proveedorId: string | null
  ): Promise<void> {
    if (categoriaId) {
      const { data } = await supabase
        .from('categorias')
        .select('id')
        .eq('id', categoriaId)
        .eq('user_id', userId)
        .maybeSingle();
      if (!data) {
        throw crearError('La categoría seleccionada no existe', 400);
      }
    }

    if (proveedorId) {
      const { data } = await supabase
        .from('proveedores')
        .select('id')
        .eq('id', proveedorId)
        .eq('user_id', userId)
        .maybeSingle();
      if (!data) {
        throw crearError('El proveedor seleccionado no existe', 400);
      }
    }
  }

  static async listar(
    userId: string,
    opciones: ListarProductosOpciones
  ): Promise<ResultadoPaginado<ProductoPublico>> {
    let query = supabase
      .from('productos')
      .select(CAMPOS_LISTADO, { count: 'exact' })
      .eq('user_id', userId);

    if (!opciones.incluirInactivos) {
      query = query.eq('activo', true);
    }

    if (opciones.categoriaId) {
      query = query.eq('categoria_id', sanitizeFilterValue(opciones.categoriaId));
    }

    if (opciones.proveedorId) {
      query = query.eq('proveedor_id', sanitizeFilterValue(opciones.proveedorId));
    }

    const termino = sanitizeSearchTerm(opciones.buscar);
    if (termino) {
      query = query.or(`nombre.ilike.%${termino}%,sku.ilike.%${termino}%`);
    }

    query = query.order('nombre', { ascending: true });

    if (opciones.paginacion) {
      const { offset, limit } = opciones.paginacion;
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error, count } = await query;
    if (error) {
      throw mapearErrorBd(error, 'Error al listar productos');
    }

    let items = (data as ProductoPublico[]) ?? [];
    // PostgREST no compara columnas entre si, por lo que el filtro de
    // "bajo stock" (stock <= stock_minimo) se aplica en memoria.
    if (opciones.soloBajoStock) {
      items = items.filter((p) => Number(p.stock) <= Number(p.stock_minimo));
    }

    return {
      items,
      total: count ?? items.length,
      page: opciones.paginacion?.page ?? 1,
      limit: opciones.paginacion?.limit ?? items.length,
    };
  }

  static async obtener(userId: string, id: string): Promise<ProductoPublico> {
    const { data, error } = await supabase
      .from('productos')
      .select(CAMPOS_LISTADO)
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw mapearErrorBd(error, 'Error al consultar el producto');
    }
    if (!data) {
      throw crearError('Producto no encontrado', 404);
    }
    return data as ProductoPublico;
  }

  static async crear(userId: string, dto: ProductoDTO): Promise<ProductoPublico> {
    const datos = this.validar(dto);
    await this.validarRelaciones(userId, datos.categoria_id, datos.proveedor_id);

    // El stock inicial siempre es 0: se modifica unicamente mediante las
    // operaciones de entrada, salida y ajuste.
    const { data, error } = await supabase
      .from('productos')
      .insert({ user_id: userId, ...datos, stock: 0 })
      .select(CAMPOS_LISTADO)
      .single();

    if (error || !data) {
      throw mapearErrorBd(error, 'Ya existe un producto con ese SKU');
    }
    return data as ProductoPublico;
  }

  static async actualizar(
    userId: string,
    id: string,
    dto: ProductoDTO
  ): Promise<ProductoPublico> {
    await this.obtener(userId, id);
    const datos = this.validar(dto);
    await this.validarRelaciones(userId, datos.categoria_id, datos.proveedor_id);

    const { data, error } = await supabase
      .from('productos')
      .update(datos)
      .eq('id', id)
      .eq('user_id', userId)
      .select(CAMPOS_LISTADO)
      .single();

    if (error || !data) {
      throw mapearErrorBd(error, 'Ya existe un producto con ese SKU');
    }
    return data as ProductoPublico;
  }

  static async cambiarEstado(
    userId: string,
    id: string,
    activo: boolean
  ): Promise<ProductoPublico> {
    await this.obtener(userId, id);

    const { data, error } = await supabase
      .from('productos')
      .update({ activo })
      .eq('id', id)
      .eq('user_id', userId)
      .select(CAMPOS_LISTADO)
      .single();

    if (error || !data) {
      throw mapearErrorBd(error, 'Error al cambiar el estado del producto');
    }
    return data as ProductoPublico;
  }

  static async eliminar(userId: string, id: string): Promise<void> {
    await this.obtener(userId, id);

    const { error } = await supabase.from('productos').delete().eq('id', id).eq('user_id', userId);

    if (error) {
      throw mapearErrorBd(
        error,
        'No se pudo eliminar el producto',
        'No se puede eliminar: el producto tiene movimientos registrados. Desactívelo en su lugar.'
      );
    }
  }
}
