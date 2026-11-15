export interface Usuario {
  id: string;
  nombres: string;
  apellidos: string;
  email: string;
  username: string;
  activo: boolean;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  usuario: Usuario;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface ResultadoPaginado<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Categoria {
  id: string;
  user_id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Proveedor {
  id: string;
  user_id: string;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  nit: string | null;
  observaciones: string | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Producto {
  id: string;
  user_id: string;
  categoria_id: string | null;
  proveedor_id: string | null;
  nombre: string;
  sku: string;
  descripcion: string | null;
  precio_compra: number | string;
  precio_venta: number | string;
  stock: number | string;
  stock_minimo: number | string;
  unidad_medida: string;
  imagen_url: string | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
  categoria?: { id: string; nombre: string } | null;
  proveedor?: { id: string; nombre: string } | null;
}
