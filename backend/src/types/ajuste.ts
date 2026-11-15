export const MOTIVOS_AJUSTE = [
  'CONTEO_FISICO',
  'ERROR_REGISTRO',
  'MERMA',
  'DEVOLUCION',
  'OTRO',
] as const;

export type MotivoAjuste = (typeof MOTIVOS_AJUSTE)[number];

export interface AjusteDTO {
  producto_id: string;
  existencias_fisicas: number | string;
  motivo: MotivoAjuste | string;
  observaciones?: string | null;
  client_request_id?: string | null;
  fecha?: string | null;
}

export interface AjustePublico {
  id: string;
  user_id: string;
  producto_id: string;
  existencias_anteriores: number;
  existencias_fisicas: number;
  diferencia: number;
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
