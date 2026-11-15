export const TIPOS_MOVIMIENTO = ['ENTRADA', 'SALIDA', 'AJUSTE'] as const;

export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

export interface MovimientoPublico {
  id: string;
  user_id: string;
  producto_id: string;
  tipo: string;
  referencia_id: string;
  descripcion: string;
  cantidad: number;
  existencias_anteriores: number;
  existencias_posteriores: number;
  motivo: string | null;
  fecha: string;
  created_at?: string;
  producto?: { id: string; nombre: string; sku: string; unidad_medida: string } | null;
}
