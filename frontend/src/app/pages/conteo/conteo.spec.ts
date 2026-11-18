import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { ConteoComponent } from './conteo';
import { ProductoService } from '../../services/producto.service';
import { AjusteService } from '../../services/ajuste.service';
import { ConteoService } from '../../services/conteo.service';
import { Producto } from '../../models';

function producto(id: string, stock: number, nombre = `Producto ${id}`): Producto {
  return {
    id,
    user_id: 'u1',
    categoria_id: null,
    proveedor_id: null,
    nombre,
    sku: `SKU-${id}`,
    descripcion: null,
    precio_compra: 5,
    precio_venta: 10,
    stock,
    stock_minimo: 2,
    unidad_medida: 'unidad',
    imagen_url: null,
    activo: true,
  };
}

function configurar(productos: Producto[]) {
  const productoService = {
    listar: vi.fn().mockReturnValue(
      of({
        success: true,
        data: { items: productos, total: productos.length, page: 1, limit: productos.length },
      }),
    ),
  };
  const ajusteService = {
    registrar: vi
      .fn()
      .mockReturnValue(of({ success: true, data: { ajuste_id: 'a1', idempotente: false } })),
  };
  const conteoService = {
    frecuencia: signal<'DIARIO' | 'SEMANAL' | 'QUINCENAL'>('SEMANAL'),
    ultimoConteo: signal<string | null>(null),
    cambiarFrecuencia: vi.fn(),
    cargarUltimoConteo: vi.fn(),
  };

  TestBed.configureTestingModule({
    imports: [ConteoComponent],
    providers: [
      { provide: ProductoService, useValue: productoService },
      { provide: AjusteService, useValue: ajusteService },
      { provide: ConteoService, useValue: conteoService },
    ],
  });

  return { productoService, ajusteService, conteoService, fixture: TestBed.createComponent(ConteoComponent) };
}

describe('ConteoComponent', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('carga los productos activos al iniciar', () => {
    const { productoService, fixture } = configurar([producto('p1', 10)]);
    fixture.detectChanges();

    expect(productoService.listar).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.filas()).toHaveLength(1);
    expect(fixture.componentInstance.resumen().contados).toBe(0);
  });

  it('resume los productos contados y sus diferencias', () => {
    const { fixture } = configurar([producto('p1', 10), producto('p2', 5)]);
    fixture.detectChanges();

    fixture.componentInstance.contar('p1', '12');
    fixture.componentInstance.contar('p2', '5');

    const resumen = fixture.componentInstance.resumen();
    expect(resumen.contados).toBe(2);
    expect(resumen.diferencias).toBe(1);
    expect(resumen.sobrantes).toBe(1);
    expect(fixture.componentInstance.hayDiferencias()).toBe(true);
  });

  it('registra solo las lineas con diferencia', () => {
    const { ajusteService, fixture } = configurar([producto('p1', 10), producto('p2', 5)]);
    fixture.detectChanges();

    fixture.componentInstance.contar('p1', '12');
    fixture.componentInstance.contar('p2', '5'); // coincide: no genera ajuste
    fixture.componentInstance.registrar();

    expect(ajusteService.registrar).toHaveBeenCalledTimes(1);
    expect(ajusteService.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        producto_id: 'p1',
        existencias_fisicas: '12',
        motivo: 'CONTEO_FISICO',
      }),
    );
    // Al terminar, el conteo queda limpio.
    expect(fixture.componentInstance.resumen().contados).toBe(0);
  });

  it('no registra nada si no hay diferencias', () => {
    const { ajusteService, fixture } = configurar([producto('p1', 10)]);
    fixture.detectChanges();

    fixture.componentInstance.contar('p1', '10');
    fixture.componentInstance.registrar();

    expect(ajusteService.registrar).not.toHaveBeenCalled();
    expect(fixture.componentInstance.error()).toBe('No hay diferencias que registrar.');
  });

  it('limpiar borra lo contado', () => {
    const { fixture } = configurar([producto('p1', 10)]);
    fixture.detectChanges();

    fixture.componentInstance.contar('p1', '7');
    expect(fixture.componentInstance.hayConteo()).toBe(true);

    fixture.componentInstance.limpiar();
    expect(fixture.componentInstance.hayConteo()).toBe(false);
  });

  it('cambiar la frecuencia la delega al servicio', () => {
    const { conteoService, fixture } = configurar([producto('p1', 10)]);
    fixture.detectChanges();

    fixture.componentInstance.cambiarFrecuencia('QUINCENAL');

    expect(conteoService.cambiarFrecuencia).toHaveBeenCalledWith('QUINCENAL');
  });

  it('reutiliza el client_request_id al reintentar una linea fallida', () => {
    const { ajusteService, fixture } = configurar([producto('p1', 10)]);
    fixture.detectChanges();

    ajusteService.registrar
      .mockReturnValueOnce(throwError(() => new Error('red')))
      .mockReturnValueOnce(of({ success: true, data: { ajuste_id: 'a1', idempotente: false } }));

    fixture.componentInstance.contar('p1', '12');
    fixture.componentInstance.registrar();
    expect(fixture.componentInstance.error()).toBeTruthy();

    fixture.componentInstance.registrar();

    const primero = ajusteService.registrar.mock.calls[0][0].client_request_id;
    const segundo = ajusteService.registrar.mock.calls[1][0].client_request_id;
    expect(primero).toBeTruthy();
    expect(segundo).toBe(primero);
    expect(fixture.componentInstance.resumen().contados).toBe(0);
  });
});
