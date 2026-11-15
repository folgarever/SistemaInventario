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

// Traduce los errores de las funciones RPC transaccionales. Las reglas de
// negocio se lanzan con RAISE EXCEPTION (codigo P0001) y deben llegar al
// usuario como errores 400 con su mensaje original.
export function mapearErrorRpc(error: { code?: string; message?: string } | null): AppError {
  if (!error) {
    return crearError('Error al ejecutar la operación', 500);
  }
  if (error.code === 'P0001') {
    return crearError(error.message || 'La operación no es válida', 400);
  }
  if (error.code === '23505') {
    return crearError('La operación ya fue registrada previamente', 409);
  }
  if (error.code === '23503') {
    return crearError('La operación hace referencia a datos inexistentes', 400);
  }
  if (error.code === '23514') {
    return crearError('Los datos no cumplen las reglas de validación', 400);
  }
  return crearError(error.message || 'Error al ejecutar la operación', 500);
}
