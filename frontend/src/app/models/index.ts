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

export interface EntradaDetalle {
  id: string;
  entrada_id: string;
  producto_id: string;
  cantidad: number | string;
  costo_unitario: number | string;
  subtotal: number | string;
  producto?: { id: string; nombre: string; sku: string; unidad_medida: string } | null;
}

export interface Entrada {
  id: string;
  user_id: string;
  proveedor_id: string | null;
  observaciones: string | null;
  total: number | string;
  client_request_id: string | null;
  fecha: string;
  created_at?: string;
  proveedor?: { id: string; nombre: string } | null;
  detalles?: EntradaDetalle[];
}

export interface ResultadoEntrada {
  entrada_id: string;
  total?: number;
  fecha?: string;
  idempotente: boolean;
}

export interface Salida {
  id: string;
  user_id: string;
  producto_id: string;
  cantidad: number | string;
  motivo: string;
  observaciones: string | null;
  client_request_id: string | null;
  fecha: string;
  created_at?: string;
  producto?: { id: string; nombre: string; sku: string; unidad_medida: string } | null;
}

export interface ResultadoSalida {
  salida_id: string;
  cantidad?: number;
  existencias_anteriores?: number;
  existencias_posteriores?: number;
  fecha?: string;
  idempotente: boolean;
}

export interface Ajuste {
  id: string;
  user_id: string;
  producto_id: string;
  existencias_anteriores: number | string;
  existencias_fisicas: number | string;
  diferencia: number | string;
  motivo: string;
  observaciones: string | null;
  client_request_id: string | null;
  fecha: string;
  created_at?: string;
  producto?: { id: string; nombre: string; sku: string; unidad_medida: string } | null;
}

export interface ResultadoAjuste {
  ajuste_id: string;
  existencias_anteriores?: number;
  existencias_fisicas?: number;
  diferencia?: number;
  fecha?: string;
  idempotente: boolean;
}

export interface Movimiento {
  id: string;
  user_id: string;
  producto_id: string;
  tipo: string;
  referencia_id: string;
  descripcion: string;
  cantidad: number | string;
  existencias_anteriores: number | string;
  existencias_posteriores: number | string;
  motivo: string | null;
  fecha: string;
  created_at?: string;
  producto?: { id: string; nombre: string; sku: string; unidad_medida: string } | null;
}

export interface TotalesDashboard {
  productos: number;
  categorias: number;
  proveedores: number;
  movimientos: number;
}

export interface InventarioDashboard {
  unidades: number | string;
  valorCompra: number | string;
  valorVenta: number | string;
}

export interface AlertaStock {
  id: string;
  nombre: string;
  sku: string;
  unidad_medida: string;
  stock: number | string;
  stock_minimo: number | string;
  faltante: number | string;
  estado: 'AGOTADO' | 'BAJO';
  categoria?: { id: string; nombre: string } | null;
}

export interface AlertasDashboard {
  agotados: number;
  bajoStock: number;
  total: number;
  items: AlertaStock[];
}

export interface ResumenDashboard {
  totales: TotalesDashboard;
  inventario: InventarioDashboard;
  alertas: AlertasDashboard;
  movimientosRecientes: Movimiento[];
}

export interface ReporteInventarioItem {
  id: string;
  nombre: string;
  sku: string;
  categoria: string | null;
  proveedor: string | null;
  unidad_medida: string;
  stock: number | string;
  stock_minimo: number | string;
  precio_compra: number | string;
  precio_venta: number | string;
  valor_compra: number | string;
  valor_venta: number | string;
  estado: 'AGOTADO' | 'BAJO' | 'DISPONIBLE';
}

export interface ReporteInventario {
  items: ReporteInventarioItem[];
  totales: {
    productos: number;
    unidades: number | string;
    valorCompra: number | string;
    valorVenta: number | string;
    agotados: number;
    bajoStock: number;
  };
}

export interface ReporteMovimientos {
  items: Movimiento[];
  totales: {
    total: number;
    entradas: number;
    salidas: number;
    ajustes: number;
    unidadesEntrada: number | string;
    unidadesSalida: number | string;
  };
}
