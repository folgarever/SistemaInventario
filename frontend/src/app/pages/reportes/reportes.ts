import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Categoria, Producto, Proveedor, ReporteInventario, ReporteMovimientos } from '../../models';
import { ReporteService } from '../../services/reporte.service';
import { CategoriaService } from '../../services/categoria.service';
import { ProveedorService } from '../../services/proveedor.service';
import { ProductoService } from '../../services/producto.service';
import { mensajeError } from '../../core/api-error.utils';
import { descargarCsv, fechaArchivo } from '../../core/csv.utils';
import { aISO, fechaHora } from '../../core/fecha.utils';
import { formatoCantidad, formatoMoneda, numero } from '../../core/formato.utils';

type TipoReporte = 'inventario' | 'movimientos';

interface Opcion {
  valor: string;
  etiqueta: string;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Reportes</h1>
          <p class="page-subtitle">Consulta y exporta la información de tu inventario.</p>
        </div>
        <button type="button" class="btn-uber" [disabled]="!hayDatos()" (click)="exportar()">
          Exportar CSV
        </button>
      </div>

      <div class="tabs">
        <button
          type="button"
          class="tab"
          [class.is-active]="tipo() === 'inventario'"
          (click)="cambiarTipo('inventario')"
        >
          Inventario valorizado
        </button>
        <button
          type="button"
          class="tab"
          [class.is-active]="tipo() === 'movimientos'"
          (click)="cambiarTipo('movimientos')"
        >
          Movimientos
        </button>
      </div>

      <div class="card mb-16">
        @if (tipo() === 'inventario') {
          <form [formGroup]="formInventario" (ngSubmit)="generar()" class="toolbar">
            <select class="form-select form-control" formControlName="categoriaId">
              <option value="">Todas las categorías</option>
              @for (c of categorias(); track c.id) {
                <option [value]="c.id">{{ c.nombre }}</option>
              }
            </select>
            <select class="form-select form-control" formControlName="proveedorId">
              <option value="">Todos los proveedores</option>
              @for (p of proveedores(); track p.id) {
                <option [value]="p.id">{{ p.nombre }}</option>
              }
            </select>
            <label class="checkbox-inline">
              <input type="checkbox" formControlName="soloBajoStock" />
              Solo bajo stock
            </label>
            <label class="checkbox-inline">
              <input type="checkbox" formControlName="incluirInactivos" />
              Incluir inactivos
            </label>
            <button type="submit" class="btn-uber" [disabled]="cargando()">Generar</button>
          </form>
        } @else {
          <form [formGroup]="formMovimientos" (ngSubmit)="generar()" class="toolbar">
            <select class="form-select form-control" formControlName="productoId">
              <option value="">Todos los productos</option>
              @for (p of productos(); track p.id) {
                <option [value]="p.id">{{ p.nombre }} ({{ p.sku }})</option>
              }
            </select>
            <select class="form-select form-control" formControlName="tipo">
              <option value="">Todos los tipos</option>
              @for (t of tiposMovimiento; track t.valor) {
                <option [value]="t.valor">{{ t.etiqueta }}</option>
              }
            </select>
            <input type="date" class="form-control" formControlName="desde" aria-label="Desde" />
            <input type="date" class="form-control" formControlName="hasta" aria-label="Hasta" />
            <button type="submit" class="btn-uber" [disabled]="cargando()">Generar</button>
          </form>
        }
      </div>

      @if (error()) {
        <div class="alert alert-danger mb-16">{{ error() }}</div>
      }

      @if (cargando()) {
        <div class="card">
          <div class="table-empty"><span class="spinner"></span></div>
        </div>
      } @else if (tipo() === 'inventario' && reporteInventario(); as ri) {
        <div class="grid grid-cards mb-16">
          <div class="stat-card">
            <span class="stat-label">Productos</span>
            <div class="stat-value">{{ ri.totales.productos }}</div>
          </div>
          <div class="stat-card">
            <span class="stat-label">Unidades</span>
            <div class="stat-value stat-value-sm font-mono">
              {{ formatoCantidad(ri.totales.unidades) }}
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-label">Valor de compra</span>
            <div class="stat-value stat-value-sm font-mono">
              {{ formatoMoneda(ri.totales.valorCompra) }}
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-label">Valor de venta</span>
            <div class="stat-value stat-value-sm font-mono">
              {{ formatoMoneda(ri.totales.valorVenta) }}
            </div>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Proveedor</th>
                <th class="text-right">Existencia</th>
                <th class="text-right">P. compra</th>
                <th class="text-right">P. venta</th>
                <th class="text-right">Valor compra</th>
                <th class="text-right">Valor venta</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              @if (ri.items.length === 0) {
                <tr>
                  <td colspan="10" class="table-empty">No hay datos para los filtros seleccionados.</td>
                </tr>
              } @else {
                @for (item of ri.items; track item.id) {
                  <tr>
                    <td class="font-mono text-muted">{{ item.sku }}</td>
                    <td class="font-bold">{{ item.nombre }}</td>
                    <td class="text-muted">{{ item.categoria || '—' }}</td>
                    <td class="text-muted">{{ item.proveedor || '—' }}</td>
                    <td class="text-right font-mono">
                      {{ formatoCantidad(item.stock) }} {{ item.unidad_medida }}
                    </td>
                    <td class="text-right font-mono">{{ formatoMoneda(item.precio_compra) }}</td>
                    <td class="text-right font-mono">{{ formatoMoneda(item.precio_venta) }}</td>
                    <td class="text-right font-mono">{{ formatoMoneda(item.valor_compra) }}</td>
                    <td class="text-right font-mono">{{ formatoMoneda(item.valor_venta) }}</td>
                    <td>
                      @switch (item.estado) {
                        @case ('AGOTADO') {
                          <span class="badge badge-agotado"><span class="badge-dot"></span>Agotado</span>
                        }
                        @case ('BAJO') {
                          <span class="badge badge-bajo"><span class="badge-dot"></span>Bajo stock</span>
                        }
                        @default {
                          <span class="badge badge-disponible"><span class="badge-dot"></span>Disponible</span>
                        }
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      } @else if (tipo() === 'movimientos' && reporteMovimientos(); as rm) {
        <div class="grid grid-cards mb-16">
          <div class="stat-card">
            <span class="stat-label">Movimientos</span>
            <div class="stat-value">{{ rm.totales.total }}</div>
          </div>
          <div class="stat-card">
            <span class="stat-label">Entradas</span>
            <div class="stat-value stat-value-sm">
              {{ rm.totales.entradas }}
              <span class="text-muted" style="font-size: 13px;">
                ({{ formatoCantidad(rm.totales.unidadesEntrada) }} u.)
              </span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-label">Salidas</span>
            <div class="stat-value stat-value-sm">
              {{ rm.totales.salidas }}
              <span class="text-muted" style="font-size: 13px;">
                ({{ formatoCantidad(rm.totales.unidadesSalida) }} u.)
              </span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-label">Ajustes</span>
            <div class="stat-value stat-value-sm">{{ rm.totales.ajustes }}</div>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Producto</th>
                <th class="text-right">Cantidad</th>
                <th class="text-right">Existencias</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              @if (rm.items.length === 0) {
                <tr>
                  <td colspan="6" class="table-empty">No hay movimientos en el rango seleccionado.</td>
                </tr>
              } @else {
                @for (m of rm.items; track m.id) {
                  <tr>
                    <td class="font-mono">{{ fechaHora(m.fecha) }}</td>
                    <td>
                      @switch (m.tipo) {
                        @case ('ENTRADA') {
                          <span class="badge badge-disponible"><span class="badge-dot"></span>Entrada</span>
                        }
                        @case ('SALIDA') {
                          <span class="badge badge-bajo"><span class="badge-dot"></span>Salida</span>
                        }
                        @default {
                          <span class="badge badge-agotado"><span class="badge-dot"></span>Ajuste</span>
                        }
                      }
                    </td>
                    <td>
                      {{ m.producto?.nombre || 'Producto' }}
                      <span class="text-muted font-mono">({{ m.producto?.sku }})</span>
                    </td>
                    <td class="text-right font-mono">
                      {{ numero(m.cantidad) > 0 ? '+' : '' }}{{ formatoCantidad(m.cantidad) }}
                      {{ m.producto?.unidad_medida }}
                    </td>
                    <td class="text-right font-mono">
                      {{ formatoCantidad(m.existencias_anteriores) }} →
                      {{ formatoCantidad(m.existencias_posteriores) }}
                    </td>
                    <td class="text-muted">
                      {{ m.descripcion }}
                      @if (m.motivo) {
                        <span class="badge badge-neutral" style="margin-left: 6px;">{{ m.motivo }}</span>
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class ReportesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private reporteService = inject(ReporteService);
  private categoriaService = inject(CategoriaService);
  private proveedorService = inject(ProveedorService);
  private productoService = inject(ProductoService);

  readonly formatoMoneda = formatoMoneda;
  readonly formatoCantidad = formatoCantidad;
  readonly fechaHora = fechaHora;
  readonly numero = numero;

  readonly tiposMovimiento: Opcion[] = [
    { valor: 'ENTRADA', etiqueta: 'Entrada' },
    { valor: 'SALIDA', etiqueta: 'Salida' },
    { valor: 'AJUSTE', etiqueta: 'Ajuste' },
  ];

  tipo = signal<TipoReporte>('inventario');
  cargando = signal(false);
  error = signal<string | null>(null);

  categorias = signal<Categoria[]>([]);
  proveedores = signal<Proveedor[]>([]);
  productos = signal<Producto[]>([]);

  reporteInventario = signal<ReporteInventario | null>(null);
  reporteMovimientos = signal<ReporteMovimientos | null>(null);

  formInventario = this.fb.nonNullable.group({
    categoriaId: [''],
    proveedorId: [''],
    soloBajoStock: [false],
    incluirInactivos: [false],
  });

  formMovimientos = this.fb.nonNullable.group({
    productoId: [''],
    tipo: [''],
    desde: [''],
    hasta: [''],
  });

  hayDatos = signal(false);

  ngOnInit(): void {
    this.categoriaService.listar({ incluirInactivos: true }).subscribe({
      next: (res) => this.categorias.set(res.data.items),
    });
    this.proveedorService.listar({ incluirInactivos: true }).subscribe({
      next: (res) => this.proveedores.set(res.data.items),
    });
    this.productoService.listar({}).subscribe({
      next: (res) => this.productos.set(res.data.items),
    });

    this.generar();
  }

  cambiarTipo(tipo: TipoReporte): void {
    if (this.tipo() === tipo) return;
    this.tipo.set(tipo);
    this.generar();
  }

  generar(): void {
    if (this.tipo() === 'inventario') {
      this.generarInventario();
    } else {
      this.generarMovimientos();
    }
  }

  private generarInventario(): void {
    const valores = this.formInventario.getRawValue();
    this.cargando.set(true);
    this.error.set(null);

    this.reporteService
      .inventario({
        categoriaId: valores.categoriaId || undefined,
        proveedorId: valores.proveedorId || undefined,
        soloBajoStock: valores.soloBajoStock,
        incluirInactivos: valores.incluirInactivos,
      })
      .subscribe({
        next: (res) => {
          this.reporteInventario.set(res.data);
          this.hayDatos.set(res.data.items.length > 0);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e, 'No se pudo generar el reporte de inventario.'));
          this.cargando.set(false);
        },
      });
  }

  private generarMovimientos(): void {
    const valores = this.formMovimientos.getRawValue();
    this.cargando.set(true);
    this.error.set(null);

    this.reporteService
      .movimientos({
        productoId: valores.productoId || undefined,
        tipo: valores.tipo || undefined,
        desde: aISO(valores.desde)?.slice(0, 10),
        hasta: valores.hasta ? `${valores.hasta}T23:59:59.999` : undefined,
      })
      .subscribe({
        next: (res) => {
          this.reporteMovimientos.set(res.data);
          this.hayDatos.set(res.data.items.length > 0);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e, 'No se pudo generar el reporte de movimientos.'));
          this.cargando.set(false);
        },
      });
  }

  exportar(): void {
    if (this.tipo() === 'inventario') {
      this.exportarInventario();
    } else {
      this.exportarMovimientos();
    }
  }

  private exportarInventario(): void {
    const reporte = this.reporteInventario();
    if (!reporte || reporte.items.length === 0) return;

    const filas: (string | number)[][] = [
      ['SKU', 'Producto', 'Categoría', 'Proveedor', 'Unidad', 'Existencia', 'Stock mínimo', 'Precio compra', 'Precio venta', 'Valor compra', 'Valor venta', 'Estado'],
    ];
    for (const item of reporte.items) {
      filas.push([
        item.sku,
        item.nombre,
        item.categoria ?? '',
        item.proveedor ?? '',
        item.unidad_medida,
        numero(item.stock),
        numero(item.stock_minimo),
        numero(item.precio_compra),
        numero(item.precio_venta),
        numero(item.valor_compra),
        numero(item.valor_venta),
        item.estado,
      ]);
    }
    filas.push([]);
    filas.push(['Totales', '', '', '', '', numero(reporte.totales.unidades), '', '', '', numero(reporte.totales.valorCompra), numero(reporte.totales.valorVenta), '']);

    descargarCsv(`reporte-inventario-${fechaArchivo()}.csv`, filas);
  }

  private exportarMovimientos(): void {
    const reporte = this.reporteMovimientos();
    if (!reporte || reporte.items.length === 0) return;

    const filas: (string | number)[][] = [
      ['Fecha', 'Tipo', 'SKU', 'Producto', 'Cantidad', 'Unidad', 'Existencias anteriores', 'Existencias posteriores', 'Motivo', 'Descripción'],
    ];
    for (const m of reporte.items) {
      filas.push([
        fechaHora(m.fecha),
        m.tipo,
        m.producto?.sku ?? '',
        m.producto?.nombre ?? '',
        numero(m.cantidad),
        m.producto?.unidad_medida ?? '',
        numero(m.existencias_anteriores),
        numero(m.existencias_posteriores),
        m.motivo ?? '',
        m.descripcion,
      ]);
    }

    descargarCsv(`reporte-movimientos-${fechaArchivo()}.csv`, filas);
  }
}
