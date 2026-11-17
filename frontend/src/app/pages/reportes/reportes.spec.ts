import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { ReportesComponent } from './reportes';
import { ReporteService } from '../../services/reporte.service';
import { ReporteInventario, ReporteVentas } from '../../models';

const VENTAS: ReporteVentas = {
  items: [
    {
      producto_id: 'p1',
      nombre: 'Café',
      sku: 'CAF-1',
      unidad_medida: 'kg',
      unidades: 3,
      precio_venta: 10,
      precio_compra: 6,
      ingreso: 30,
      costo: 18,
      ganancia: 12,
      margen: 40,
    },
  ],
  totales: { operaciones: 1, unidades: 3, ingreso: 30, costo: 18, ganancia: 12, margen: 40 },
};

const INVENTARIO: ReporteInventario = {
  items: [
    {
      id: 'p1',
      nombre: 'Café',
      sku: 'CAF-1',
      categoria: 'Bebidas',
      proveedor: null,
      unidad_medida: 'kg',
      stock: 3,
      stock_minimo: 5,
      precio_compra: 6,
      precio_venta: 10,
      valor_compra: 18,
      valor_venta: 30,
      estado: 'BAJO',
    },
  ],
  totales: { productos: 1, unidades: 3, valorCompra: 18, valorVenta: 30, agotados: 0, bajoStock: 1 },
};

describe('ReportesComponent', () => {
  let servicio: { ventas: ReturnType<typeof vi.fn>; inventario: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    servicio = {
      ventas: vi.fn().mockReturnValue(of({ success: true, data: VENTAS })),
      inventario: vi.fn().mockReturnValue(of({ success: true, data: INVENTARIO })),
    };

    await TestBed.configureTestingModule({
      imports: [ReportesComponent],
      providers: [{ provide: ReporteService, useValue: servicio }],
    }).compileComponents();
  });

  it('carga el reporte de ventas al iniciar', () => {
    const fixture = TestBed.createComponent(ReportesComponent);
    fixture.detectChanges();

    expect(servicio.ventas).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.pestana()).toBe('ventas');
    expect(fixture.componentInstance.ventas()?.totales.ganancia).toBe(12);
  });

  it('cambia a inventario y carga su reporte', () => {
    const fixture = TestBed.createComponent(ReportesComponent);
    fixture.detectChanges();

    fixture.componentInstance.cambiarPestana('inventario');

    expect(servicio.inventario).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.inventario()?.totales.bajoStock).toBe(1);
  });

  it('traduce el estado de stock a etiqueta y clase', () => {
    const fixture = TestBed.createComponent(ReportesComponent);

    expect(fixture.componentInstance.etiquetaEstado('AGOTADO')).toBe('Agotado');
    expect(fixture.componentInstance.etiquetaEstado('BAJO')).toBe('Bajo stock');
    expect(fixture.componentInstance.claseEstado('BAJO')).toContain('badge-bajo');
    expect(fixture.componentInstance.claseEstado('DISPONIBLE')).toContain('badge-disponible');
  });

  it('construye la lista de reposición al cambiar a esa pestaña', () => {
    const fixture = TestBed.createComponent(ReportesComponent);
    fixture.detectChanges();

    fixture.componentInstance.cambiarPestana('reposicion');

    expect(servicio.inventario).toHaveBeenCalledWith({ soloBajoStock: true });
    const lista = fixture.componentInstance.reposicion();
    expect(lista?.totales.productos).toBe(1);
    expect(lista?.totales.bajoStock).toBe(1);
    // stock 3, mínimo 5 -> objetivo 10, sugerido 7; costo 7 * 6 = 42
    expect(lista?.items[0].sugerido).toBe(7);
    expect(lista?.items[0].costo_estimado).toBe(42);
  });

  it('renderiza la tabla de reposición con la cantidad sugerida', () => {
    const fixture = TestBed.createComponent(ReportesComponent);
    fixture.detectChanges();

    fixture.componentInstance.cambiarPestana('reposicion');
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(texto).toContain('Productos a reponer');
    expect(texto).toContain('Costo estimado de reposición');
    expect(texto).toContain('Sugerido');
    expect(texto).toContain('Café');
  });
});
