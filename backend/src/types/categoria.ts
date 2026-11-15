export interface CategoriaDTO {
  nombre: string;
  descripcion?: string | null;
}

export interface CategoriaPublica {
  id: string;
  user_id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}
