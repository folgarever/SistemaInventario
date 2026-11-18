import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { environment } from '../../environments/environment';
import { AlertasDashboard, AlertaStock } from '../models';
import { NotificacionService } from './notificacion.service';

function alerta(id: string, estado: 'AGOTADO' | 'BAJO'): AlertaStock {
  return {
    id,
    nombre: `Producto ${id}`,
    sku: `SKU-${id}`,
    unidad_medida: 'unidad',
    stock: estado === 'AGOTADO' ? 0 : 2,
    stock_minimo: 5,
    faltante: 5,
    estado,
  };
}

function resumen(items: AlertaStock[]): AlertasDashboard {
  return { agotados: 0, bajoStock: items.length, total: items.length, items };
}

// Stub del API de Notification para simular el navegador en las pruebas.
function conNotification(permiso: NotificationPermission) {
  class FakeNotification {
    static permission = permiso;
    static requestPermission = vi.fn(async () => permiso);
    constructor(
      public titulo: string,
      public opciones?: NotificationOptions,
    ) {}
  }
  (globalThis as unknown as { Notification: unknown }).Notification = FakeNotification;
  return FakeNotification;
}

function sinNotification() {
  delete (globalThis as unknown as { Notification?: unknown }).Notification;
}

function configurar(): NotificacionService {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  return TestBed.inject(NotificacionService);
}

describe('NotificacionService', () => {
  const originalNotification = (globalThis as unknown as { Notification?: unknown }).Notification;

  beforeEach(() => localStorage.clear());

  afterEach(() => {
    (globalThis as unknown as { Notification?: unknown }).Notification = originalNotification;
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('marca no soportado cuando el navegador no expone Notification', async () => {
    sinNotification();
    const servicio = configurar();

    expect(servicio.soportado).toBe(false);
    await expect(servicio.activar()).resolves.toBe(false);
  });

  it('no avisa cuando esta desactivado', () => {
    conNotification('granted');
    const servicio = configurar();
    const mostrar = vi.spyOn(servicio as unknown as { mostrar: () => void }, 'mostrar');

    servicio.procesar(resumen([alerta('p1', 'AGOTADO')]));

    expect(mostrar).not.toHaveBeenCalled();
    expect(localStorage.getItem('notif_stock_firma')).toBeNull();
  });

  it('avisa solo de las alertas nuevas y no repite', () => {
    localStorage.setItem('notif_stock_habilitado', 'true');
    conNotification('granted');
    const servicio = configurar();
    const mostrar = vi
      .spyOn(servicio as unknown as { mostrar: () => void }, 'mostrar')
      .mockResolvedValue(undefined);

    servicio.procesar(resumen([alerta('p1', 'AGOTADO')]));
    expect(mostrar).toHaveBeenCalledTimes(1);

    mostrar.mockClear();
    servicio.procesar(resumen([alerta('p1', 'AGOTADO')]));
    expect(mostrar).not.toHaveBeenCalled();

    // Cambia de estado: vuelve a avisar.
    mostrar.mockClear();
    servicio.procesar(resumen([alerta('p1', 'BAJO')]));
    expect(mostrar).toHaveBeenCalledTimes(1);
  });

  it('activa los avisos cuando el navegador concede el permiso', async () => {
    conNotification('granted');
    const servicio = configurar();

    await expect(servicio.activar()).resolves.toBe(true);
    expect(servicio.habilitado()).toBe(true);
    expect(localStorage.getItem('notif_stock_habilitado')).toBe('true');

    // Limpia el temporizador para no dejar trabajo pendiente en la prueba.
    (servicio as unknown as { detener: () => void }).detener();
  });

  it('no activa los avisos si el navegador niega el permiso', async () => {
    conNotification('denied');
    const servicio = configurar();

    await expect(servicio.activar()).resolves.toBe(false);
    expect(servicio.habilitado()).toBe(false);
  });

  it('desactivar apaga los avisos y borra la firma', () => {
    localStorage.setItem('notif_stock_habilitado', 'true');
    localStorage.setItem('notif_stock_firma', JSON.stringify({ p1: 'AGOTADO' }));
    conNotification('granted');
    const servicio = configurar();

    servicio.desactivar();

    expect(servicio.habilitado()).toBe(false);
    expect(localStorage.getItem('notif_stock_firma')).toBeNull();
  });
});
