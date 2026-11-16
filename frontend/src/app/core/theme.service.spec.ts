import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeService } from './theme.service';

const CLAVE = 'sistema_inventario_tema';

describe('ThemeService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('usa el tema claro cuando no hay preferencia ni tema del sistema oscuro', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    const servicio = TestBed.inject(ThemeService);

    expect(servicio.tema()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('respeta la preferencia guardada', () => {
    localStorage.setItem(CLAVE, 'dark');
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    const servicio = TestBed.inject(ThemeService);

    expect(servicio.tema()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('alterna entre claro y oscuro y guarda la eleccion', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
    const servicio = TestBed.inject(ThemeService);
    expect(servicio.tema()).toBe('light');

    servicio.alternar();

    expect(servicio.tema()).toBe('dark');
    expect(localStorage.getItem(CLAVE)).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    servicio.alternar();
    expect(servicio.tema()).toBe('light');
    expect(localStorage.getItem(CLAVE)).toBe('light');
  });
});
