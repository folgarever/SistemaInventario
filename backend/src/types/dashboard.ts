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

// Resumen del flujo de inventario: cuantas operaciones y unidades entraron y
// salieron. Sirve para mostrar el proceso (entradas -> inventario -> salidas).
export interface FlujoDashboard {
  entradas: number;
  salidas: number;
  ajustes: number;
  unidadesEntrada: number;
  unidadesSalida: number;
}

export interface ResumenDashboard {
  totales: TotalesDashboard;
  inventario: InventarioDashboard;
  alertas: AlertasDashboard;
  flujo: FlujoDashboard;
  movimientosRecientes: unknown[];
}
