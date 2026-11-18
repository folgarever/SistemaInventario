import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { InstalarPwaComponent } from './instalar-pwa';
import { PwaInstallService } from '../../core/pwa-install.service';

function servicioFalso(opciones: { mostrar: boolean; puede: boolean }) {
  return {
    puedeInstalar: () => opciones.puede,
    instalado: () => false,
    esIOS: () => !opciones.puede,
    mostrarBoton: () => opciones.mostrar,
    instalar: vi.fn().mockResolvedValue('accepted'),
  };
}

function crear(opciones: { mostrar: boolean; puede: boolean }) {
  const fake = servicioFalso(opciones);
  TestBed.configureTestingModule({
    imports: [InstalarPwaComponent],
    providers: [{ provide: PwaInstallService, useValue: fake }],
  });
  const fixture = TestBed.createComponent(InstalarPwaComponent);
  fixture.detectChanges();
  return { fixture, fake };
}

describe('InstalarPwaComponent', () => {
  it('no muestra el boton cuando no corresponde', () => {
    const { fixture } = crear({ mostrar: false, puede: false });
    expect((fixture.nativeElement as HTMLElement).querySelector('.btn-instalar')).toBeNull();
  });

  it('llama al dialogo nativo cuando el navegador lo ofrece', () => {
    const { fixture, fake } = crear({ mostrar: true, puede: true });
    const boton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.btn-instalar',
    );

    boton?.click();

    expect(fake.instalar).toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).querySelector('app-modal')).toBeNull();
  });

  it('abre las instrucciones en iOS en lugar del dialogo nativo', () => {
    const { fixture, fake } = crear({ mostrar: true, puede: false });
    const boton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.btn-instalar',
    );

    boton?.click();
    fixture.detectChanges();

    const modal = (fixture.nativeElement as HTMLElement).querySelector('app-modal');
    expect(modal).toBeTruthy();
    expect(modal?.textContent).toContain('Añadir a pantalla de inicio');
    expect(fake.instalar).not.toHaveBeenCalled();
  });
});
