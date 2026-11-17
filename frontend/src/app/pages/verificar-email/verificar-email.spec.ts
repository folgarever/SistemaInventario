import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { VerificarEmailComponent } from './verificar-email';
import { AuthService } from '../../core/auth.service';

function configurar(token: string | null) {
  const auth = {
    isAuthenticated: signal(false),
    verificarEmail: vi.fn().mockReturnValue(of({ success: true })),
    refrescarPerfil: vi.fn().mockReturnValue(of({ success: true, data: {} })),
  };

  const route = {
    snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) },
  };

  TestBed.configureTestingModule({
    imports: [VerificarEmailComponent],
    providers: [
      { provide: AuthService, useValue: auth },
      { provide: ActivatedRoute, useValue: route },
    ],
  });

  return { auth, fixture: TestBed.createComponent(VerificarEmailComponent) };
}

describe('VerificarEmailComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('verifica el correo con el token de la URL', () => {
    const { auth, fixture } = configurar('token-123');
    fixture.detectChanges();

    expect(auth.verificarEmail).toHaveBeenCalledWith('token-123');
    expect(fixture.componentInstance.listo()).toBe(true);
    expect(fixture.componentInstance.cargando()).toBe(false);
  });

  it('muestra un error si no hay token', () => {
    const { auth, fixture } = configurar(null);
    fixture.detectChanges();

    expect(auth.verificarEmail).not.toHaveBeenCalled();
    expect(fixture.componentInstance.error()).not.toBeNull();
    expect(fixture.componentInstance.cargando()).toBe(false);
  });

  it('muestra el mensaje del backend si la verificación falla', () => {
    const { auth, fixture } = configurar('expirado');
    auth.verificarEmail.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'El enlace de verificación ha expirado' },
          }),
      ),
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.listo()).toBe(false);
    expect(fixture.componentInstance.error()).toContain('expirado');
  });
});
