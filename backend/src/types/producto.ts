export interface ProductoDTO {
  nombre: string;
  sku: string;
  categoria_id?: string | null;
  proveedor_id?: string | null;
  descripcion?: string | null;
  precio_compra?: number | string | null;
  precio_venta?: number | string | null;
  stock_minimo?: number | string | null;
  unidad_medida?: string | null;
  imagen_url?: string | null;
}

export interface ProductoPublico {
  id: string;
  user_id: string;
  categoria_id: string | null;
  proveedor_id: string | null;
  nombre: string;
  sku: string;
  descripcion: string | null;
  precio_compra: number;
  precio_venta: number;
  stock: number;
  stock_minimo: number;
  unidad_medida: string;
  imagen_url: string | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
  categoria?: { id: string; nombre: string } | null;
  proveedor?: { id: string; nombre: string } | null;
}
