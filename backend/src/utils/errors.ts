import { AppError } from '../middlewares/errorHandler';

// Crea un error con codigo HTTP para que el manejador global lo formatee.
export function crearError(message: string, statusCode: number = 400): AppError {
  const err = new Error(message) as AppError;
  err.statusCode = statusCode;
  return err;
}

// Traduce los codigos de error de PostgreSQL/PostgREST a mensajes claros.
// 23505 = unique_violation, 23503 = foreign_key_violation, 23514 = check_violation.
export function mapearErrorBd(
  error: { code?: string; message?: string } | null,
  mensajeUnico = 'Ya existe un registro con esos datos',
  mensajeRelacion = 'No se puede eliminar: hay registros relacionados'
): AppError {
  if (error?.code === '23505') {
    return crearError(mensajeUnico, 409);
  }
  if (error?.code === '23503') {
    return crearError(mensajeRelacion, 409);
  }
  if (error?.code === '23514') {
    return crearError('Los datos no cumplen las reglas de validacion', 400);
  }
  return crearError(error?.message || 'Error al acceder a la base de datos', 500);
}
