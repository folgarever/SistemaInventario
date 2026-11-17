import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';

// El registro debe estar habilitado para probar sus validaciones.
process.env.REGISTRATION_ENABLED = 'true';

let AuthService: typeof import('../src/services/authService').AuthService;

before(async () => {
  ({ AuthService } = await import('../src/services/authService'));
});

describe('AuthService.registrar (validaciones previas a la base de datos)', () => {
  it('exige todos los campos obligatorios', async () => {
    await assert.rejects(() => AuthService.registrar({} as any), /obligatorios/);
  });

  it('valida el formato del correo', async () => {
    await assert.rejects(
      () =>
        AuthService.registrar({
          nombres: 'Ana',
          apellidos: 'Pérez',
          email: 'correo-malo',
          username: 'ana',
          password: 'abcd1234',
        } as any),
      /correo/i
    );
  });

  it('valida la longitud del nombre de usuario', async () => {
    await assert.rejects(
      () =>
        AuthService.registrar({
          nombres: 'Ana',
          apellidos: 'Pérez',
          email: 'ana@ejemplo.com',
          username: 'ab',
          password: 'abcd1234',
        } as any),
      /usuario/i
    );
  });

  it('exige una contraseña con longitud mínima', async () => {
    await assert.rejects(
      () =>
        AuthService.registrar({
          nombres: 'Ana',
          apellidos: 'Pérez',
          email: 'ana@ejemplo.com',
          username: 'ana',
          password: 'corta',
        } as any),
      /contraseña/i
    );
  });
});

describe('AuthService.cambiarPassword (validaciones)', () => {
  it('exige la contraseña actual y la nueva', async () => {
    await assert.rejects(() => AuthService.cambiarPassword('u1', {} as any), /contraseña actual/i);
  });

  it('valida la fortaleza de la nueva contraseña', async () => {
    await assert.rejects(
      () => AuthService.cambiarPassword('u1', { passwordActual: 'abcd1234', passwordNueva: 'x' }),
      /contraseña/i
    );
  });

  it('rechaza que la nueva contraseña sea igual a la actual', async () => {
    await assert.rejects(
      () =>
        AuthService.cambiarPassword('u1', {
          passwordActual: 'abcd1234',
          passwordNueva: 'abcd1234',
        }),
      /diferente/i
    );
  });
});

describe('AuthService (validaciones varias)', () => {
  it('eliminarCuenta exige la contraseña de confirmación', async () => {
    await assert.rejects(() => AuthService.eliminarCuenta('u1', ''), /confirmar su contraseña/i);
  });

  it('verificarEmail rechaza un token vacío', async () => {
    await assert.rejects(() => AuthService.verificarEmail(''), /enlace/i);
  });

  it('restablecerPassword rechaza un token vacío', async () => {
    await assert.rejects(
      () => AuthService.restablecerPassword({ token: '', passwordNueva: 'abcd1234' }),
      /enlace/i
    );
  });
});

describe('AuthService.generarToken', () => {
  it('firma un token verificable con el secreto de la aplicación', () => {
    const token = AuthService.generarToken({
      id: 'u1',
      username: 'ana',
      email: 'ana@ejemplo.com',
      nombres: 'Ana',
      apellidos: 'Pérez',
    });

    const decodificado = jwt.verify(token, env.JWT_SECRET) as any;
    assert.equal(decodificado.id, 'u1');
    assert.equal(decodificado.username, 'ana');
  });
});
