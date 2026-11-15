export interface TotalesDashboard {
  productos: number;
  categorias: number;
  proveedores: number;
  movimientos: number;
}

export interface InventarioDashboard {
  unidades: number;
  valorCompra: number;
  valorVenta: number;
}

export interface AlertaStock {
  id: string;
  nombre: string;
  sku: string;
  unidad_medida: string;
  stock: number;
  stock_minimo: number;
  faltante: number;
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
  movimientosRecientes: unknown[];
}
