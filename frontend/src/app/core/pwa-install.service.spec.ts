import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PwaInstallService } from './pwa-install.service';

type Resultado = 'accepted' | 'dismissed';

// Crea un evento beforeinstallprompt falso con las mismas funciones que usa el
// servicio (prompt y userChoice).
function eventoInstalacion(outcome: Resultado): Event {
  const evento = new Event('beforeinstallprompt') as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: Resultado; platform: string }>;
  };
  evento.prompt = vi.fn().mockResolvedValue(undefined);
  evento.userChoice = Promise.resolve({ outcome, platform: 'web' });
  return evento;
}

function stubStandalone(matches: boolean): void {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches }));
}

describe('PwaInstallService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('no ofrece el boton mientras el navegador no avise', () => {
    stubStandalone(false);
    const servicio = TestBed.inject(PwaInstallService);

    expect(servicio.puedeInstalar()).toBe(false);
    expect(servicio.mostrarBoton()).toBe(false);
  });

  it('habilita el boton cuando llega beforeinstallprompt', () => {
    stubStandalone(false);
    const servicio = TestBed.inject(PwaInstallService);

    window.dispatchEvent(eventoInstalacion('accepted'));

    expect(servicio.puedeInstalar()).toBe(true);
    expect(servicio.mostrarBoton()).toBe(true);
  });

  it('instala y marca la app como instalada cuando el usuario acepta', async () => {
    stubStandalone(false);
    const servicio = TestBed.inject(PwaInstallService);
    const evento = eventoInstalacion('accepted');
    window.dispatchEvent(evento);

    const resultado = await servicio.instalar();

    expect(resultado).toBe('accepted');
    expect(servicio.instalado()).toBe(true);
    expect(servicio.mostrarBoton()).toBe(false);
  });

  it('oculta el boton si el usuario cancela', async () => {
    stubStandalone(false);
    const servicio = TestBed.inject(PwaInstallService);
    window.dispatchEvent(eventoInstalacion('dismissed'));

    const resultado = await servicio.instalar();

    expect(resultado).toBe('dismissed');
    expect(servicio.instalado()).toBe(false);
    expect(servicio.puedeInstalar()).toBe(false);
  });

  it('no intenta instalar si el navegador nunca ofrecio el dialogo', async () => {
    stubStandalone(false);
    const servicio = TestBed.inject(PwaInstallService);

    expect(await servicio.instalar()).toBe('no-disponible');
  });

  it('no ofrece el boton si la app ya corre instalada', () => {
    stubStandalone(true);
    const servicio = TestBed.inject(PwaInstallService);

    expect(servicio.instalado()).toBe(true);
    expect(servicio.mostrarBoton()).toBe(false);
  });

  it('detecta iPhone para mostrar las instrucciones', () => {
    stubStandalone(false);
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    });

    const servicio = TestBed.inject(PwaInstallService);

    expect(servicio.esIOS()).toBe(true);
    expect(servicio.mostrarBoton()).toBe(true);
  });
});
