import { Component, OnInit, inject, signal } from '@angular/core';
import { ReporteService } from '../../services/reporte.service';
import { mensajeError } from '../../core/api-error.utils';
import {
  finDiaISO,
  hoyInput,
  inicioDiaISO,
  primerDiaMesAnteriorInput,
  primerDiaMesInput,
  ultimoDiaMesAnteriorInput,
} from '../../core/fecha.utils';
import { formatoCantidad, formatoMoneda } from '../../core/formato.utils';
import { DocumentoPdf, fechaArchivo, generarPdf } from '../../core/pdf.utils';
import { ReporteInventario, ReporteVentas } from '../../models';

type Pestana = 'ventas' | 'inventario';

// Reportes de la tienda: ventas y ganancia por periodo, y valor del inventario.
// Las exportaciones se generan en PDF con la identidad visual del sistema.
@Component({
  selector: 'app-reportes',
  standalone: true,
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Reportes</h1>
          <p class="page-subtitle">Ventas, ganancia y valor del inventario por periodo.</p>
        </div>
        <div class="actions">
          <button
            type="button"
            class="btn-uber btn-uber-outline"
            [disabled]="exportando() || sinDatos()"
            (click)="exportar()"
          >
            {{ exportando() ? 'Generando…' : 'Exportar PDF' }}
          </button>
        </div>
      </div>

      <div class="tabs">
        <button
          type="button"
          class="tab"
          [class.is-active]="pestana() === 'ventas'"
          (click)="cambiarPestana('ventas')"
        >
          Ventas y ganancia
        </button>
        <button
          type="button"
          class="tab"
          [class.is-active]="pestana() === 'inventario'"
          (click)="cambiarPestana('inventario')"
        >
          Inventario
        </button>
      </div>

      <div class="reportes-filtros">
        @if (pestana() === 'ventas') {
          <div class="campo-fecha">
            <label class="form-label" for="r_desde">Desde</label>
            <input
              id="r_desde"
              type="date"
              class="form-control"
              [value]="desde()"
              (change)="cambiarDesde($event)"
            />
          </div>
          <div class="campo-fecha">
            <label class="form-label" for="r_hasta">Hasta</label>
            <input
              id="r_hasta"
              type="date"
              class="form-control"
              [value]="hasta()"
              (change)="cambiarHasta($event)"
            />
          </div>
          <button type="button" class="btn-uber btn-uber-outline btn-sm" (click)="rangoMesActual()">
            Este mes
          </button>
          <button
            type="button"
            class="btn-uber btn-uber-outline btn-sm"
            (click)="rangoMesAnterior()"
          >
            Mes anterior
          </button>
          <button type="button" class="btn-uber btn-sm" (click)="cargar()">Aplicar</button>
        } @else {
          <label class="checkbox-inline">
            <input
              type="checkbox"
              [checked]="soloBajoStock()"
              (change)="alternarBajoStock($event)"
            />
            Solo bajo stock
          </label>
          <label class="checkbox-inline">
            <input
              type="checkbox"
              [checked]="incluirInactivos()"
              (change)="alternarInactivos($event)"
            />
            Incluir inactivos
          </label>
        }
      </div>

      @if (error()) {
        <div class="alert alert-danger mb-16">{{ error() }}</div>
      }

      @if (cargando()) {
        <div class="grid grid-cards mb-16" aria-hidden="true">
          @for (tarjeta of [1, 2, 3, 4, 5]; track tarjeta) {
            <div class="stat-card">
              <span class="skeleton skeleton-text" style="width: 55%"></span>
              <div class="skeleton skeleton-value mt-8" style="width: 70%"></div>
            </div>
          }
        </div>
        <div class="table-wrapper" aria-hidden="true">
          <table class="table">
            <tbody>
              @for (fila of filasSkeleton; track fila) {
                <tr class="skeleton-row">
                  <td><span class="skeleton skeleton-line" style="width: 85%"></span></td>
                  <td><span class="skeleton skeleton-line" style="width: 60%"></span></td>
                  <td><span class="skeleton skeleton-line" style="width: 70%"></span></td>
                  <td><span class="skeleton skeleton-line" style="width: 55%"></span></td>
                  <td><span class="skeleton skeleton-line" style="width: 50%"></span></td>
                  <td><span class="skeleton skeleton-line" style="width: 65%"></span></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else if (pestana() === 'ventas') {
        @if (ventas(); as v) {
          <div class="grid grid-cards mb-16">
            <div class="stat-card">
              <span class="stat-label">Operaciones</span>
              <div class="stat-value">{{ v.totales.operaciones }}</div>
            </div>
            <div class="stat-card">
              <span class="stat-label">Unidades vendidas</span>
              <div class="stat-value stat-value-sm font-mono">
                {{ formatoCantidad(v.totales.unidades) }}
              </div>
            </div>
            <div class="stat-card">
              <span class="stat-label">Ingreso</span>
              <div class="stat-value stat-value-sm font-mono">
                {{ formatoMoneda(v.totales.ingreso) }}
              </div>
            </div>
            <div class="stat-card">
              <span class="stat-label">Ganancia estimada</span>
              <div
                class="stat-value stat-value-sm font-mono"
                [class.ganancia-positiva]="v.totales.ganancia >= 0"
                [class.ganancia-negativa]="v.totales.ganancia < 0"
              >
                {{ formatoMoneda(v.totales.ganancia) }}
              </div>
            </div>
            <div class="stat-card">
              <span class="stat-label">Margen</span>
              <div class="stat-value stat-value-sm font-mono">
                {{ formatoCantidad(v.totales.margen) }} %
              </div>
            </div>
          </div>

          <p class="text-muted mb-16">
            La ganancia es una estimación: se calcula con el precio de venta y el costo actuales de
            cada producto, no con el precio aplicado en el momento de la venta.
          </p>

          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>SKU</th>
                  <th class="text-right">Unidades</th>
                  <th class="text-right">Precio venta</th>
                  <th class="text-right">Costo</th>
                  <th class="text-right">Ingreso</th>
                  <th class="text-right">Ganancia</th>
                  <th class="text-right">Margen</th>
                </tr>
              </thead>
              <tbody>
                @for (item of v.items; track item.producto_id) {
                  <tr>
                    <td>{{ item.nombre }}</td>
                    <td class="font-mono">{{ item.sku }}</td>
                    <td class="text-right font-mono">
                      {{ formatoCantidad(item.unidades) }} {{ item.unidad_medida }}
                    </td>
                    <td class="text-right font-mono">{{ formatoMoneda(item.precio_venta) }}</td>
                    <td class="text-right font-mono">{{ formatoMoneda(item.precio_compra) }}</td>
                    <td class="text-right font-mono">{{ formatoMoneda(item.ingreso) }}</td>
                    <td
                      class="text-right font-mono"
                      [class.ganancia-positiva]="item.ganancia >= 0"
                      [class.ganancia-negativa]="item.ganancia < 0"
                    >
                      {{ formatoMoneda(item.ganancia) }}
                    </td>
                    <td class="text-right font-mono">{{ formatoCantidad(item.margen) }} %</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8">
                      <div class="empty-state">
                        <span class="empty-state-icon" aria-hidden="true">↓</span>
                        <span class="empty-state-title">Sin ventas en el periodo</span>
                        <span class="empty-state-text">
                          No hay ventas registradas en el periodo seleccionado.
                        </span>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      } @else {
        @if (inventario(); as r) {
          <div class="grid grid-cards mb-16">
            <div class="stat-card">
              <span class="stat-label">Productos</span>
              <div class="stat-value">{{ r.totales.productos }}</div>
            </div>
            <div class="stat-card">
              <span class="stat-label">Unidades en existencia</span>
              <div class="stat-value stat-value-sm font-mono">
                {{ formatoCantidad(r.totales.unidades) }}
              </div>
            </div>
            <div class="stat-card">
              <span class="stat-label">Valor a costo</span>
              <div class="stat-value stat-value-sm font-mono">
                {{ formatoMoneda(r.totales.valorCompra) }}
              </div>
            </div>
            <div class="stat-card">
              <span class="stat-label">Valor a precio de venta</span>
              <div class="stat-value stat-value-sm font-mono">
                {{ formatoMoneda(r.totales.valorVenta) }}
              </div>
            </div>
            <div class="stat-card">
              <span class="stat-label">Agotados / bajo stock</span>
              <div class="stat-value stat-value-sm">
                <span class="text-danger">{{ r.totales.agotados }}</span>
                <span class="text-muted"> / {{ r.totales.bajoStock }}</span>
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
                  <th class="text-right">Costo</th>
                  <th class="text-right">Precio venta</th>
                  <th class="text-right">Existencias</th>
                  <th class="text-right">Stock mínimo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (item of r.items; track item.id) {
                  <tr>
                    <td class="font-mono">{{ item.sku }}</td>
                    <td>{{ item.nombre }}</td>
                    <td>{{ item.categoria || '—' }}</td>
                    <td>{{ item.proveedor || '—' }}</td>
                    <td class="text-right font-mono">{{ formatoMoneda(item.precio_compra) }}</td>
                    <td class="text-right font-mono">{{ formatoMoneda(item.precio_venta) }}</td>
                    <td class="text-right font-mono">
                      {{ formatoCantidad(item.stock) }} {{ item.unidad_medida }}
                    </td>
                    <td class="text-right font-mono">{{ formatoCantidad(item.stock_minimo) }}</td>
                    <td>
                      <span [class]="claseEstado(item.estado)">
                        <span class="badge-dot"></span>{{ etiquetaEstado(item.estado) }}
                      </span>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="9">
                      <div class="empty-state">
                        <span class="empty-state-icon" aria-hidden="true">▤</span>
                        <span class="empty-state-title">Sin productos</span>
                        <span class="empty-state-text">No hay productos que coincidan con el filtro.</span>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </div>
  `,
})
export class ReportesComponent implements OnInit {
  private reporteService = inject(ReporteService);

  readonly formatoMoneda = formatoMoneda;
  readonly formatoCantidad = formatoCantidad;

  // Filas de relleno que se muestran mientras carga el reporte.
  readonly filasSkeleton = [1, 2, 3, 4, 5];

  pestana = signal<Pestana>('ventas');
  desde = signal(primerDiaMesInput());
  hasta = signal(hoyInput());
  soloBajoStock = signal(false);
  incluirInactivos = signal(false);

  ventas = signal<ReporteVentas | null>(null);
  inventario = signal<ReporteInventario | null>(null);

  cargando = signal(false);
  error = signal<string | null>(null);
  exportando = signal(false);

  ngOnInit(): void {
    this.cargar();
  }

  sinDatos(): boolean {
    return this.pestana() === 'ventas'
      ? (this.ventas()?.items.length ?? 0) === 0
      : (this.inventario()?.items.length ?? 0) === 0;
  }

  cambiarPestana(p: Pestana): void {
    if (this.pestana() === p) return;
    this.pestana.set(p);
    this.cargar();
  }

  cambiarDesde(evento: Event): void {
    this.desde.set((evento.target as HTMLInputElement).value);
  }

  cambiarHasta(evento: Event): void {
    this.hasta.set((evento.target as HTMLInputElement).value);
  }

  alternarBajoStock(evento: Event): void {
    this.soloBajoStock.set((evento.target as HTMLInputElement).checked);
    this.cargarInventario();
  }

  alternarInactivos(evento: Event): void {
    this.incluirInactivos.set((evento.target as HTMLInputElement).checked);
    this.cargarInventario();
  }

  rangoMesActual(): void {
    this.desde.set(primerDiaMesInput());
    this.hasta.set(hoyInput());
    this.cargar();
  }

  rangoMesAnterior(): void {
    this.desde.set(primerDiaMesAnteriorInput());
    this.hasta.set(ultimoDiaMesAnteriorInput());
    this.cargar();
  }

  cargar(): void {
    if (this.pestana() === 'ventas') {
      this.cargarVentas();
    } else {
      this.cargarInventario();
    }
  }

  private cargarVentas(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.reporteService
      .ventas({ desde: inicioDiaISO(this.desde()), hasta: finDiaISO(this.hasta()) })
      .subscribe({
        next: (res) => {
          this.ventas.set(res.data);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e, 'No se pudo cargar el reporte de ventas.'));
          this.cargando.set(false);
        },
      });
  }

  private cargarInventario(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.reporteService
      .inventario({
        soloBajoStock: this.soloBajoStock(),
        incluirInactivos: this.incluirInactivos(),
      })
      .subscribe({
        next: (res) => {
          this.inventario.set(res.data);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e, 'No se pudo cargar el reporte de inventario.'));
          this.cargando.set(false);
        },
      });
  }

  claseEstado(estado: string): string {
    if (estado === 'AGOTADO') return 'badge badge-agotado';
    if (estado === 'BAJO') return 'badge badge-bajo';
    return 'badge badge-disponible';
  }

  etiquetaEstado(estado: string): string {
    if (estado === 'AGOTADO') return 'Agotado';
    if (estado === 'BAJO') return 'Bajo stock';
    return 'Disponible';
  }

  async exportar(): Promise<void> {
    this.exportando.set(true);
    try {
      if (this.pestana() === 'ventas') {
        await this.exportarVentas();
      } else {
        await this.exportarInventario();
      }
    } catch {
      this.error.set('No se pudo generar el PDF.');
    } finally {
      this.exportando.set(false);
    }
  }

  private async exportarVentas(): Promise<void> {
    const v = this.ventas();
    if (!v) return;

    const documento: DocumentoPdf = {
      titulo: 'Reporte de ventas y ganancia',
      meta: [`Periodo: ${this.desde()} a ${this.hasta()}`, 'La ganancia se estima con los precios actuales.'],
      resumen: [
        { etiqueta: 'Operaciones', valor: String(v.totales.operaciones) },
        { etiqueta: 'Unidades', valor: formatoCantidad(v.totales.unidades) },
        { etiqueta: 'Ingreso', valor: formatoMoneda(v.totales.ingreso) },
        { etiqueta: 'Ganancia estimada', valor: formatoMoneda(v.totales.ganancia) },
        { etiqueta: 'Margen', valor: `${formatoCantidad(v.totales.margen)} %` },
      ],
      secciones: [
        {
          titulo: 'Detalle por producto',
          columnas: [
            { encabezado: 'Producto', clave: 'nombre' },
            { encabezado: 'SKU', clave: 'sku' },
            { encabezado: 'Unidades', clave: 'unidades', alineacion: 'right' },
            { encabezado: 'Precio venta', clave: 'precio_venta', alineacion: 'right' },
            { encabezado: 'Costo', clave: 'precio_compra', alineacion: 'right' },
            { encabezado: 'Ingreso', clave: 'ingreso', alineacion: 'right' },
            { encabezado: 'Ganancia', clave: 'ganancia', alineacion: 'right' },
            { encabezado: 'Margen', clave: 'margen', alineacion: 'right' },
          ],
          filas: v.items.map((item) => ({
            nombre: item.nombre,
            sku: item.sku,
            unidades: `${formatoCantidad(item.unidades)} ${item.unidad_medida}`,
            precio_venta: formatoMoneda(item.precio_venta),
            precio_compra: formatoMoneda(item.precio_compra),
            ingreso: formatoMoneda(item.ingreso),
            ganancia: formatoMoneda(item.ganancia),
            margen: `${formatoCantidad(item.margen)} %`,
          })),
        },
      ],
      nombreArchivo: `reporte-ventas-${fechaArchivo()}.pdf`,
      horizontal: true,
    };

    await generarPdf(documento);
  }

  private async exportarInventario(): Promise<void> {
    const r = this.inventario();
    if (!r) return;

    const documento: DocumentoPdf = {
      titulo: 'Reporte de inventario',
      meta: [
        `Productos: ${r.totales.productos}`,
        this.soloBajoStock() ? 'Filtro: solo bajo stock' : 'Incluye todos los productos',
      ],
      resumen: [
        { etiqueta: 'Unidades', valor: formatoCantidad(r.totales.unidades) },
        { etiqueta: 'Valor a costo', valor: formatoMoneda(r.totales.valorCompra) },
        { etiqueta: 'Valor a venta', valor: formatoMoneda(r.totales.valorVenta) },
        { etiqueta: 'Agotados', valor: String(r.totales.agotados) },
        { etiqueta: 'Bajo stock', valor: String(r.totales.bajoStock) },
      ],
      secciones: [
        {
          titulo: 'Productos',
          columnas: [
            { encabezado: 'SKU', clave: 'sku' },
            { encabezado: 'Producto', clave: 'nombre' },
            { encabezado: 'Categoría', clave: 'categoria' },
            { encabezado: 'Proveedor', clave: 'proveedor' },
            { encabezado: 'Costo', clave: 'precio_compra', alineacion: 'right' },
            { encabezado: 'Precio venta', clave: 'precio_venta', alineacion: 'right' },
            { encabezado: 'Existencias', clave: 'stock', alineacion: 'right' },
            { encabezado: 'Stock mínimo', clave: 'stock_minimo', alineacion: 'right' },
            { encabezado: 'Estado', clave: 'estado' },
          ],
          filas: r.items.map((item) => ({
            sku: item.sku,
            nombre: item.nombre,
            categoria: item.categoria ?? '—',
            proveedor: item.proveedor ?? '—',
            precio_compra: formatoMoneda(item.precio_compra),
            precio_venta: formatoMoneda(item.precio_venta),
            stock: `${formatoCantidad(item.stock)} ${item.unidad_medida}`,
            stock_minimo: formatoCantidad(item.stock_minimo),
            estado: this.etiquetaEstado(item.estado),
          })),
        },
      ],
      nombreArchivo: `reporte-inventario-${fechaArchivo()}.pdf`,
      horizontal: true,
    };

    await generarPdf(documento);
  }
}
