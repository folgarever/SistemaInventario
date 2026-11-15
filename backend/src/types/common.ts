// Tipos compartidos por los modulos del backend.

export interface ResultadoPaginado<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface RespuestaApi<T> {
  success: boolean;
  message?: string;
  data: T;
}
