import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeFilterValue, sanitizeSearchTerm } from '../src/utils/sanitize';
import { parsePaginacion } from '../src/utils/pagination';
import { crearError, mapearErrorBd, mapearErrorRpc } from '../src/utils/errors';

describe('sanitizeFilterValue', () => {
  it('elimina los separadores de filtros de PostgREST', () => {
    assert.equal(sanitizeFilterValue('a,b(c)d\\e'), 'abcde');
  });

  it('colapsa espacios y recorta los extremos', () => {
    assert.equal(sanitizeFilterValue('  hola   mundo  '), 'hola mundo');
  });

  it('convierte valores nulos o indefinidos en cadena vacía', () => {
    assert.equal(sanitizeFilterValue(null), '');
    assert.equal(sanitizeFilterValue(undefined), '');
  });

  it('sanitizeSearchTerm delega en sanitizeFilterValue', () => {
    assert.equal(sanitizeSearchTerm('x,y(z'), 'xyz');
  });
});

describe('parsePaginacion', () => {
  const req = (query: Record<string, unknown>) => ({ query }) as any;

  it('devuelve null cuando no se solicita paginación', () => {
    assert.equal(parsePaginacion(req({})), null);
  });

  it('calcula el offset a partir de page y limit', () => {
    assert.deepEqual(parsePaginacion(req({ page: '3', limit: '10' })), {
      page: 3,
      limit: 10,
      offset: 20,
    });
  });

  it('aplica el mínimo de página y el máximo de límite', () => {
    assert.deepEqual(parsePaginacion(req({ page: '0', limit: '9999' })), {
      page: 1,
      limit: 200,
      offset: 0,
    });
  });

  it('usa el límite por defecto cuando limit no es numérico', () => {
    assert.deepEqual(parsePaginacion(req({ limit: 'abc' }), 25), {
      page: 1,
      limit: 25,
      offset: 0,
    });
  });
});

describe('errores', () => {
  it('crearError asigna el código HTTP y el mensaje', () => {
    const error = crearError('boom', 409);
    assert.equal(error.statusCode, 409);
    assert.equal(error.message, 'boom');
  });

  it('mapearErrorBd traduce los códigos conocidos de PostgreSQL', () => {
    assert.equal(mapearErrorBd({ code: '23505' }).statusCode, 409);
    assert.equal(mapearErrorBd({ code: '23503' }).statusCode, 409);
    assert.equal(mapearErrorBd({ code: '23514' }).statusCode, 400);
    assert.equal(mapearErrorBd({ code: 'XX000', message: 'raro' }).statusCode, 500);
  });

  it('mapearErrorRpc convierte P0001 en un error 400 con el mensaje original', () => {
    const error = mapearErrorRpc({ code: 'P0001', message: 'Stock insuficiente' });
    assert.equal(error.statusCode, 400);
    assert.equal(error.message, 'Stock insuficiente');
  });

  it('mapearErrorRpc devuelve 500 cuando no hay error', () => {
    assert.equal(mapearErrorRpc(null).statusCode, 500);
  });
});
