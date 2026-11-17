import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { PerfilComponent } from './perfil';
import { AuthService } from '../../core/auth.service';
import { Usuario } from '../../models';

const USUARIO: Usuario = {
  id: 'u1',
  nombres: 'Ana',
  apellidos: 'Pérez',
  email: 'ana@ejemplo.com',
  username: 'ana',
  activo: true,
};

function configurar(usuario: Usuario) {
  const auth = {
    currentUser: signal<Usuario | null>(usuario),
    refrescarPerfil: vi.fn().mockReturnValue(of({ success: true, data: usuario })),
    actualizarPerfil: vi.fn().mockReturnValue(of({ success: true, data: usuario })),
    cambiarPassword: vi.fn().mockReturnValue(of({ success: true })),
    eliminarCuenta: vi.fn().mockReturnValue(of({ success: true })),
    logout: vi.fn(),
  };

  TestBed.configureTestingModule({
    imports: [PerfilComponent],
    providers: [{ provide: AuthService, useValue: auth }],
  });

  return { auth, fixture: TestBed.createComponent(PerfilComponent) };
}

describe('PerfilComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('muestra los datos del perfil y la zona de eliminar cuenta', () => {
    const { fixture } = configurar(USUARIO);
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Eliminar mi cuenta');
    expect(texto).not.toContain('Correo sin verificar');
  });

  it('pide la contraseña antes de eliminar la cuenta', () => {
    const { auth, fixture } = configurar(USUARIO);
    fixture.detectChanges();

    fixture.componentInstance.confirmarEliminar.set(true);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Confirma tu contraseña');

    fixture.componentInstance.formEliminar.setValue({ password: 'secreta123' });
    fixture.componentInstance.eliminarCuenta();

    expect(auth.eliminarCuenta).toHaveBeenCalledWith('secreta123');
  });
});
