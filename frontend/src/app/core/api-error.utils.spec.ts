import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { mensajeError } from './api-error.utils';

describe('mensajeError', () => {
  it('informa cuando no hay conexión con el servidor', () => {
    const error = new HttpErrorResponse({ status: 0 });
    expect(mensajeError(error)).toContain('conectar con el servidor');
  });

  it('usa el mensaje enviado por la API', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { success: false, message: 'El SKU ya existe.' },
    });
    expect(mensajeError(error)).toBe('El SKU ya existe.');
  });

  it('usa el cuerpo de texto plano cuando no es JSON', () => {
    const error = new HttpErrorResponse({ status: 500, error: 'Error interno' });
    expect(mensajeError(error)).toBe('Error interno');
  });

  it('usa el mensaje de un Error normal', () => {
    expect(mensajeError(new Error('algo falló'))).toBe('algo falló');
  });

  it('devuelve el mensaje por defecto cuando no reconoce el error', () => {
    expect(mensajeError({}, 'Mensaje por defecto')).toBe('Mensaje por defecto');
    expect(mensajeError(undefined)).toContain('inesperado');
  });
});
