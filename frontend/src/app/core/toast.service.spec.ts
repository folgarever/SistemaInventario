import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let servicio: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    servicio = new ToastService();
  });

  afterEach(() => vi.useRealTimers());

  it('inicia sin notificaciones', () => {
    expect(servicio.toasts()).toEqual([]);
  });

  it('agrega notificaciones con su tipo', () => {
    servicio.exito('Listo');
    servicio.error('Fallo');

    expect(servicio.toasts().length).toBe(2);
    expect(servicio.toasts()[0]).toMatchObject({ mensaje: 'Listo', tipo: 'success' });
    expect(servicio.toasts()[1]).toMatchObject({ mensaje: 'Fallo', tipo: 'error' });
  });

  it('cierra una notificación por su id', () => {
    const id = servicio.mostrar('Hola', 'info');
    servicio.cerrar(id);
    expect(servicio.toasts()).toEqual([]);
  });

  it('cierra las notificaciones automáticamente', () => {
    servicio.exito('Listo');
    expect(servicio.toasts().length).toBe(1);

    vi.advanceTimersByTime(4000);
    expect(servicio.toasts()).toEqual([]);
  });
});
