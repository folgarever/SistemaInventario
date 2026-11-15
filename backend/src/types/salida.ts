export const MOTIVOS_SALIDA = [
  'VENTA',
  'DANADO',
  'PERDIDO',
  'USO_INTERNO',
  'AJUSTE',
  'OTRO',
] as const;

export type MotivoSalida = (typeof MOTIVOS_SALIDA)[number];

export interface SalidaDTO {
  producto_id: string;
  cantidad: number | string;
  motivo: MotivoSalida | string;
  observaciones?: string | null;
  client_request_id?: string | null;
  fecha?: string | null;
}

export interface SalidaPublica {
  id: string;
  user_id: string;
  producto_id: string;
  cantidad: number;
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
