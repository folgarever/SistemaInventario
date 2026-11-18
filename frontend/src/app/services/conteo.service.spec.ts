import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../environments/environment';
import { ConteoService } from './conteo.service';

describe('ConteoService', () => {
  let servicio: ConteoService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(ConteoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('usa semanal por defecto', () => {
    expect(servicio.frecuencia()).toBe('SEMANAL');
  });

  it('guarda y recupera la frecuencia elegida', () => {
    servicio.cambiarFrecuencia('QUINCENAL');

    expect(servicio.frecuencia()).toBe('QUINCENAL');
    expect(localStorage.getItem('conteo_frecuencia')).toBe('QUINCENAL');
  });

  it('trae la fecha del ultimo conteo desde los ajustes', () => {
    servicio.cargarUltimoConteo();

    const req = http.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/ajustes` &&
        r.params.get('motivo') === 'CONTEO_FISICO' &&
        r.params.get('limit') === '1',
    );
    req.flush({
      success: true,
      data: {
        items: [
          {
            id: 'a1',
            user_id: 'u1',
            producto_id: 'p1',
            existencias_anteriores: 5,
            existencias_fisicas: 4,
            diferencia: -1,
            motivo: 'CONTEO_FISICO',
            observaciones: null,
            client_request_id: null,
            fecha: '2026-11-10T12:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 1,
      },
    });

    expect(servicio.ultimoConteo()).toBe('2026-11-10T12:00:00.000Z');
  });

  it('deja el ultimo conteo en null cuando no hay ajustes', () => {
    servicio.cargarUltimoConteo();

    const req = http.expectOne((r) => r.url === `${environment.apiUrl}/ajustes`);
    req.flush({ success: true, data: { items: [], total: 0, page: 1, limit: 1 } });

    expect(servicio.ultimoConteo()).toBeNull();
  });
});
