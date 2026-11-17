import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { supabase } from '../config/supabase';
import { env } from '../config/env';
import {
  RegistroDTO,
  LoginDTO,
  AuthResponse,
  UsuarioPublico,
  TokenPayload,
  CambiarPasswordDTO,
  RestablecerPasswordDTO,
} from '../types/auth';
import { sanitizeFilterValue } from '../utils/sanitize';
import { AppError } from '../middlewares/errorHandler';
import { enviarCorreoRestablecimiento } from './emailService';

const MAX_NOMBRE = 100;
const MAX_APELLIDO = 100;
const MIN_PASSWORD = 8;
const RESET_TOKEN_MINUTOS = 60;

function createAuthError(message: string, statusCode: number = 400): AppError {
  const err = new Error(message) as AppError;
  err.statusCode = statusCode;
  return err;
}

// Genera el hash SHA-256 del token de restablecimiento. Se guarda el hash,
// nunca el token en claro, para que un acceso a la tabla no permita usarlo.
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Valida la fortaleza minima de una contraseña.
function validarPassword(password: string): void {
  if (!password || password.length < MIN_PASSWORD) {
    throw createAuthError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres`);
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw createAuthError('La contraseña debe incluir al menos una letra y un número');
  }
}

export class AuthService {
  static generarToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
  }

  static async registrar(dto: RegistroDTO): Promise<AuthResponse> {
    // Permite cerrar el registro publico de nuevas cuentas desde el entorno.
    if (!env.REGISTRATION_ENABLED) {
      throw createAuthError(
        'El registro de nuevas cuentas esta deshabilitado. Contacte al administrador.',
        403
      );
    }

    const nombres = dto.nombres?.trim();
    const apellidos = dto.apellidos?.trim();
    const email = dto.email?.trim().toLowerCase();
    const username = dto.username?.trim().toLowerCase();
    const password = dto.password;

    if (!nombres || !apellidos || !email || !username || !password) {
      throw createAuthError(
        'Todos los campos son obligatorios (nombres, apellidos, correo, usuario y contraseña)'
      );
    }

    if (nombres.length > MAX_NOMBRE || apellidos.length > MAX_APELLIDO) {
      throw createAuthError(`Los nombres y apellidos no pueden superar los ${MAX_NOMBRE} caracteres`);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw createAuthError('El correo electrónico no tiene un formato válido');
    }

    if (!/^[a-z0-9._-]+$/.test(username)) {
      throw createAuthError(
        'El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos'
      );
    }

    if (username.length < 3 || username.length > 30) {
      throw createAuthError('El nombre de usuario debe tener entre 3 y 30 caracteres');
    }

    validarPassword(password);

    // Comprobar si ya existe el correo o el nombre de usuario
    const { data: existenteEmail, error: errorEmail } = await supabase
      .from('usuarios')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    if (errorEmail && errorEmail.code !== 'PGRST116') {
      throw createAuthError('Error al validar el correo: ' + errorEmail.message, 500);
    }

    if (existenteEmail) {
      throw createAuthError('Ya existe una cuenta registrada con este correo electrónico', 409);
    }

    const { data: existenteUser, error: errorUser } = await supabase
      .from('usuarios')
      .select('id')
      .ilike('username', username)
      .maybeSingle();

    if (errorUser && errorUser.code !== 'PGRST116') {
      throw createAuthError('Error al validar el nombre de usuario: ' + errorUser.message, 500);
    }

    if (existenteUser) {
      throw createAuthError('El nombre de usuario ya está en uso', 409);
    }

    // Hashear contraseña de forma segura
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const { data: nuevoUsuario, error: errorInsert } = await supabase
      .from('usuarios')
      .insert({
        nombres,
        apellidos,
        email,
        username,
        password_hash,
        activo: true,
      })
      .select('id, nombres, apellidos, email, username, activo, created_at')
      .single();

    if (errorInsert || !nuevoUsuario) {
      throw createAuthError(
        'Error al registrar el usuario: ' + (errorInsert?.message || 'Error desconocido'),
        500
      );
    }

    const usuarioPublico: UsuarioPublico = {
      id: nuevoUsuario.id,
      nombres: nuevoUsuario.nombres,
      apellidos: nuevoUsuario.apellidos,
      email: nuevoUsuario.email,
      username: nuevoUsuario.username,
      activo: nuevoUsuario.activo,
      created_at: nuevoUsuario.created_at,
    };

    const token = this.generarToken({
      id: usuarioPublico.id,
      username: usuarioPublico.username,
      email: usuarioPublico.email,
      nombres: usuarioPublico.nombres,
      apellidos: usuarioPublico.apellidos,
    });

    return { token, usuario: usuarioPublico };
  }

  static async login(dto: LoginDTO): Promise<AuthResponse> {
    const usernameOrEmail = dto.usernameOrEmail?.trim().toLowerCase();
    const password = dto.password;

    if (!usernameOrEmail || !password) {
      throw createAuthError('Debe ingresar su usuario o correo y su contraseña');
    }

    // Se sanea el valor para evitar manipular el filtro OR de PostgREST.
    const valorSaneado = sanitizeFilterValue(usernameOrEmail);

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('*')
      .or(`username.ilike.${valorSaneado},email.ilike.${valorSaneado}`)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw createAuthError('Error al consultar usuario: ' + error.message, 500);
    }

    if (!usuario) {
      throw createAuthError('Credenciales inválidas', 401);
    }

    if (!usuario.activo) {
      throw createAuthError('La cuenta se encuentra desactivada', 403);
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      throw createAuthError('Credenciales inválidas', 401);
    }

    const usuarioPublico: UsuarioPublico = {
      id: usuario.id,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      email: usuario.email,
      username: usuario.username,
      activo: usuario.activo,
      created_at: usuario.created_at,
    };

    const token = this.generarToken({
      id: usuarioPublico.id,
      username: usuarioPublico.username,
      email: usuarioPublico.email,
      nombres: usuarioPublico.nombres,
      apellidos: usuarioPublico.apellidos,
    });

    return { token, usuario: usuarioPublico };
  }

  static async obtenerPerfil(userId: string): Promise<UsuarioPublico> {
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, nombres, apellidos, email, username, activo, created_at')
      .eq('id', userId)
      .single();

    if (error || !usuario) {
      throw createAuthError('Usuario no encontrado', 404);
    }

    return usuario as UsuarioPublico;
  }

  static async actualizarPerfil(
    userId: string,
    dto: { nombres?: string; apellidos?: string }
  ): Promise<UsuarioPublico> {
    const nombres = dto.nombres?.trim();
    const apellidos = dto.apellidos?.trim();

    if (!nombres || !apellidos) {
      throw createAuthError('El nombre y el apellido son obligatorios');
    }

    if (nombres.length > MAX_NOMBRE || apellidos.length > MAX_APELLIDO) {
      throw createAuthError(`Los nombres y apellidos no pueden superar los ${MAX_NOMBRE} caracteres`);
    }

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .update({ nombres, apellidos, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('id, nombres, apellidos, email, username, activo, created_at')
      .single();

    if (error || !usuario) {
      throw createAuthError(
        'Error al actualizar el perfil: ' + (error?.message || 'Error desconocido'),
        500
      );
    }

    return usuario as UsuarioPublico;
  }

  static async cambiarPassword(userId: string, dto: CambiarPasswordDTO): Promise<void> {
    const passwordActual = dto.passwordActual;
    const passwordNueva = dto.passwordNueva;

    if (!passwordActual || !passwordNueva) {
      throw createAuthError('Debe ingresar su contraseña actual y la nueva contraseña');
    }

    validarPassword(passwordNueva);

    if (passwordNueva === passwordActual) {
      throw createAuthError('La nueva contraseña debe ser diferente a la actual');
    }

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, password_hash')
      .eq('id', userId)
      .single();

    if (error || !usuario) {
      throw createAuthError('Usuario no encontrado', 404);
    }

    const passwordValida = await bcrypt.compare(passwordActual, usuario.password_hash);
    if (!passwordValida) {
      throw createAuthError('La contraseña actual es incorrecta', 401);
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(passwordNueva, salt);

    const { error: errorUpdate } = await supabase
      .from('usuarios')
      .update({ password_hash, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (errorUpdate) {
      throw createAuthError('Error al actualizar la contraseña: ' + errorUpdate.message, 500);
    }
  }

  // Solicita el restablecimiento. Por seguridad, siempre responde con exito
  // (no revela si el correo existe o no).
  static async solicitarRestablecimiento(email: string): Promise<void> {
    const correo = email?.trim().toLowerCase();
    if (!correo) {
      throw createAuthError('Debe indicar su correo electrónico');
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id, nombres, email, activo')
      .ilike('email', correo)
      .maybeSingle();

    if (!usuario || !usuario.activo) {
      return;
    }

    // Invalida tokens anteriores y crea uno nuevo.
    await supabase
      .from('password_reset_tokens')
      .update({ usado: true })
      .eq('user_id', usuario.id)
      .eq('usado', false);

    const token = crypto.randomBytes(32).toString('hex');
    const token_hash = hashToken(token);
    const expira_at = new Date(Date.now() + RESET_TOKEN_MINUTOS * 60 * 1000).toISOString();

    const { error } = await supabase.from('password_reset_tokens').insert({
      user_id: usuario.id,
      token_hash,
      expira_at,
      usado: false,
    });

    if (error) {
      throw createAuthError('Error al generar el enlace de restablecimiento', 500);
    }

    const enlace = `${env.FRONTEND_URL}/restablecer?token=${token}`;
    await enviarCorreoRestablecimiento(usuario.email, usuario.nombres, enlace);
  }

  static async restablecerPassword(dto: RestablecerPasswordDTO): Promise<void> {
    const token = dto.token?.trim();
    const passwordNueva = dto.passwordNueva;

    if (!token) {
      throw createAuthError('El enlace de restablecimiento no es válido');
    }

    validarPassword(passwordNueva);

    const token_hash = hashToken(token);

    const { data: registro, error } = await supabase
      .from('password_reset_tokens')
      .select('id, user_id, expira_at, usado')
      .eq('token_hash', token_hash)
      .eq('usado', false)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw createAuthError('Error al validar el enlace', 500);
    }

    if (!registro) {
      throw createAuthError('El enlace de restablecimiento es inválido o ya fue utilizado');
    }

    if (new Date(registro.expira_at).getTime() < Date.now()) {
      throw createAuthError('El enlace de restablecimiento ha expirado');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(passwordNueva, salt);

    const { error: errorUpdate } = await supabase
      .from('usuarios')
      .update({ password_hash, updated_at: new Date().toISOString() })
      .eq('id', registro.user_id);

    if (errorUpdate) {
      throw createAuthError('Error al actualizar la contraseña: ' + errorUpdate.message, 500);
    }

    await supabase
      .from('password_reset_tokens')
      .update({ usado: true })
      .eq('id', registro.id);
  }

  // Elimina la cuenta del usuario y todos sus datos asociados.
  // Exige la contraseña actual como confirmación de identidad.
  static async eliminarCuenta(userId: string, password: string): Promise<void> {
    if (!password) {
      throw createAuthError('Debe confirmar su contraseña para eliminar la cuenta');
    }

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, password_hash')
      .eq('id', userId)
      .single();

    if (error || !usuario) {
      throw createAuthError('Usuario no encontrado', 404);
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      throw createAuthError('La contraseña es incorrecta', 401);
    }

    // El borrado se hace en una función de base de datos para respetar el
    // orden de las claves foráneas y poder eliminar el historial inmutable.
    const { error: errorDelete } = await supabase.rpc('eliminar_cuenta', { p_user_id: userId });

    if (errorDelete) {
      throw createAuthError('Error al eliminar la cuenta: ' + errorDelete.message, 500);
    }
  }
}
