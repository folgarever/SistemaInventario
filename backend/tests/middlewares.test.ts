import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../src/middlewares/authMiddleware';
import { rateLimit } from '../src/middlewares/rateLimit';
import { errorHandler, notFoundHandler } from '../src/middlewares/errorHandler';
import { env } from '../src/config/env';
import { crearReq, crearRes } from './helpers';

describe('authenticateToken', () => {
  it('rechaza la petición cuando no hay token', () => {
    const res = crearRes();
    let siguiente = false;
    authenticateToken(crearReq(), res, () => {
      siguiente = true;
    });

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.equal(siguiente, false);
  });

  it('rechaza un token inválido', () => {
    const res = crearRes();
    authenticateToken(crearReq({ headers: { authorization: 'Bearer no-es-un-jwt' } }), res, () => {});

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
  });

  it('acepta un token válido y adjunta el usuario a la petición', () => {
    const token = jwt.sign(
      { id: 'u1', username: 'ana', email: 'ana@ejemplo.com', nombres: 'Ana', apellidos: 'Pérez' },
      env.JWT_SECRET
    );
    const req: any = crearReq({ headers: { authorization: `Bearer ${token}` } });
    const res = crearRes();
    let siguiente = false;

    authenticateToken(req, res, () => {
      siguiente = true;
    });

    assert.equal(siguiente, true);
    assert.equal(req.user.id, 'u1');
  });
});

describe('rateLimit', () => {
  it('permite hasta el máximo y luego responde 429', () => {
    const limitador = rateLimit({ windowMs: 60_000, max: 2, message: 'demasiadas' });
    const req = crearReq({ path: `/limite-${Math.random()}` });
    const res = crearRes();
    let permitidas = 0;
    const siguiente = () => {
      permitidas += 1;
    };

    limitador(req, res, siguiente);
    limitador(req, res, siguiente);
    limitador(req, res, siguiente);

    assert.equal(permitidas, 2);
    assert.equal(res.statusCode, 429);
    assert.equal(res.body.message, 'demasiadas');
  });
});

describe('errorHandler', () => {
  it('usa el código HTTP del error y responde en el formato de la API', () => {
    const res = crearRes();
    errorHandler({ message: 'No autorizado', statusCode: 403 } as any, crearReq(), res, () => {});

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'No autorizado');
  });

  it('normaliza códigos HTTP inválidos a 500', () => {
    const original = console.error;
    console.error = () => {};
    try {
      const res = crearRes();
      errorHandler({ message: 'raro', statusCode: 200 } as any, crearReq(), res, () => {});
      assert.equal(res.statusCode, 500);
    } finally {
      console.error = original;
    }
  });
});

describe('notFoundHandler', () => {
  it('responde 404 incluyendo la ruta solicitada', () => {
    const res = crearRes();
    notFoundHandler(crearReq({ method: 'GET', originalUrl: '/api/inexistente' }), res, () => {});

    assert.equal(res.statusCode, 404);
    assert.match(res.body.message, /\/api\/inexistente/);
  });
});
