import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AlertaService } from './alerta.service';
import { environment } from '../../environments/environment';

describe('AlertaService', () => {
  let servicio: AlertaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    servicio = TestBed.inject(AlertaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('inicia sin alertas', () => {
    expect(servicio.total()).toBe(0);
    expect(servicio.agotados()).toBe(0);
  });

  it('carga el conteo desde el endpoint de alertas', () => {
    servicio.cargar();

    const req = http.expectOne(`${environment.apiUrl}/alertas`);
    req.flush({ success: true, data: { agotados: 2, bajoStock: 3, total: 5, items: [] } });

    expect(servicio.total()).toBe(5);
    expect(servicio.agotados()).toBe(2);
  });

  it('sincroniza el resumen y limpia el conteo', () => {
    servicio.sincronizar({ agotados: 1, bajoStock: 4, total: 5, items: [] });
    expect(servicio.total()).toBe(5);

    servicio.limpiar();
    expect(servicio.total()).toBe(0);
    expect(servicio.agotados()).toBe(0);
  });
});
