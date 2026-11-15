export interface RegistroDTO {
  nombres: string;
  apellidos: string;
  email: string;
  username: string;
  password: string;
}

export interface LoginDTO {
  usernameOrEmail: string;
  password: string;
}

export interface TokenPayload {
  id: string;
  username: string;
  email: string;
  nombres: string;
  apellidos: string;
}

export interface UsuarioPublico {
  id: string;
  nombres: string;
  apellidos: string;
  email: string;
  username: string;
  activo: boolean;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  usuario: UsuarioPublico;
}

export interface CambiarPasswordDTO {
  passwordActual: string;
  passwordNueva: string;
}

export interface RestablecerPasswordDTO {
  token: string;
  passwordNueva: string;
}
