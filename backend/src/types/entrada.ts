export interface EntradaItemDTO {
  producto_id: string;
  cantidad: number | string;
  costo_unitario: number | string;
}

export interface EntradaDTO {
  proveedor_id?: string | null;
  observaciones?: string | null;
  client_request_id?: string | null;
  fecha?: string | null;
  items: EntradaItemDTO[];
}

export interface EntradaDetallePublico {
  id: string;
  entrada_id: string;
  producto_id: string;
  cantidad: number;
  costo_unitario: number;
  subtotal: number;
  producto?: { id: string; nombre: string; sku: string; unidad_medida: string } | null;
}

export interface EntradaPublica {
  id: string;
  user_id: string;
  proveedor_id: string | null;
  observaciones: string | null;
  total: number;
  client_request_id: string | null;
  fecha: string;
  created_at?: string;
  proveedor?: { id: string; nombre: string } | null;
  detalles?: EntradaDetallePublico[];
}

export interface ResultadoEntrada {
  entrada_id: string;
  total?: number;
  fecha?: string;
  productos?: unknown;
  idempotente: boolean;
}
