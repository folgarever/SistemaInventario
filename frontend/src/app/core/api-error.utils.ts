import { HttpErrorResponse } from '@angular/common/http';

// Extrae un mensaje legible de un error HTTP devuelto por la API.
// La API responde con { success: false, message: '...' }.
export function mensajeError(
  error: unknown,
  porDefecto = 'Ocurrió un error inesperado. Inténtalo de nuevo.',
): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
    }
    const cuerpo = error.error;
    if (cuerpo && typeof cuerpo === 'object' && typeof cuerpo.message === 'string') {
      return cuerpo.message;
    }
    if (typeof cuerpo === 'string' && cuerpo.trim().length > 0) {
      return cuerpo;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return porDefecto;
}
