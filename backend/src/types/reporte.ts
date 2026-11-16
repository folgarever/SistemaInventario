import { MovimientoPublico } from './movimiento';

export interface ReporteInventarioItem {
  id: string;
  nombre: string;
  sku: string;
  categoria: string | null;
  proveedor: string | null;
  unidad_medida: string;
  stock: number;
  stock_minimo: number;
  precio_compra: number;
  precio_venta: number;
  valor_compra: number;
  valor_venta: number;
  estado: 'AGOTADO' | 'BAJO' | 'DISPONIBLE';
}

export interface ReporteInventario {
  items: ReporteInventarioItem[];
  totales: {
    productos: number;
    unidades: number;
    valorCompra: number;
    valorVenta: number;
    agotados: number;
    bajoStock: number;
  };
}

export interface ReporteMovimientos {
  items: MovimientoPublico[];
  totales: {
    total: number;
    entradas: number;
    salidas: number;
    ajustes: number;
    unidadesEntrada: number;
    unidadesSalida: number;
  };
}

export interface ReporteVentasItem {
  producto_id: string;
  nombre: string;
  sku: string;
  unidad_medida: string;
  unidades: number;
  precio_venta: number;
  precio_compra: number;
  ingreso: number;
  costo: number;
  ganancia: number;
  margen: number;
}

export interface ReporteVentas {
  items: ReporteVentasItem[];
  totales: {
    operaciones: number;
    unidades: number;
    ingreso: number;
    costo: number;
    ganancia: number;
    margen: number;
  };
}
