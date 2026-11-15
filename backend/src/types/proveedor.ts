export interface ProveedorDTO {
  nombre: string;
  contacto?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  nit?: string | null;
  observaciones?: string | null;
}

export interface ProveedorPublico {
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
