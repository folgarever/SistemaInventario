import { Component, OnInit, inject, signal } from '@angular/core';
import { ReporteService } from '../../services/reporte.service';
import { mensajeError } from '../../core/api-error.utils';
import {
  fechaCorta,
  finDiaISO,
  hoyInput,
  inicioDiaISO,
  primerDiaMesAnteriorInput,
  primerDiaMesInput,
  ultimoDiaMesAnteriorInput,
} from '../../core/fecha.utils';
import { formatoCantidad, formatoMoneda, numero } from '../../core/formato.utils';
import { DocumentoPdf, fechaArchivo, fechaHoraArchivo, generarPdf } from '../../core/pdf.utils';
import {
  agruparPorProveedor,
  construirListaReposicion,
  ItemReposicion,
  ListaReposicion,
} from '../../core/reposicion.utils';
import {
  ReporteInventario,
  ReporteMermas,
  ReporteRotacion,
  ReporteRotacionItem,
  ReporteVentas,
} from '../../models';

type Pestana = 'ventas' | 'inventario' | 'reposicion' | 'mermas' | 'rotacion';

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
        <button
          type="button"
          class="tab"
          [class.is-active]="pestana() === 'reposicion'"
          (click)="cambiarPestana('reposicion')"
        >
          Reposición
        </button>
        <button
          type="button"
          class="tab"
          [class.is-active]="pestana() === 'mermas'"
          (click)="cambiarPestana('mermas')"
        >
          Mermas
        </button>
        <button
          type="button"
          class="tab"
          [class.is-active]="pestana() === 'rotacion'"
          (click)="cambiarPestana('rotacion')"
        >
          Rotación
        </button>
      </div>

      <div class="reportes-filtros">
        @if (pestana() === 'ventas' || pestana() === 'mermas' || pestana() === 'rotacion') {
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
          @if (pestana() === 'rotacion') {
            <label class="checkbox-inline">
              <input
                type="checkbox"
                [checked]="soloSinMovimiento()"
                (change)="alternarSinMovimiento($event)"
              />
              Solo sin movimiento
            </label>
          }
        } @else if (pestana() === 'inventario') {
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
        } @else {
          <p class="text-muted">
            Productos con stock bajo o agotado. La cantidad sugerida repone hasta el doble del stock
            mínimo de cada producto.
          </p>
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
      } @else if (pestana() === 'inventario') {
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
      } @else if (pestana() === 'mermas') {
        @if (mermas(); as m) {
          <div class="grid grid-cards mb-16">
            <div class="stat-card">
              <span class="stat-label">Operaciones</span>
              <div class="stat-value">{{ m.totales.operaciones }}</div>
            </div>
            <div class="stat-card">
              <span class="stat-label">Unidades perdidas</span>
              <div class="stat-value stat-value-sm font-mono">
                {{ formatoCantidad(m.totales.unidades) }}
              </div>
            </div>
            <div class="stat-card">
              <span class="stat-label">Pérdida total</span>
              <div class="stat-value stat-value-sm font-mono text-danger">
                {{ formatoMoneda(m.totales.costo) }}
              </div>
            </div>
            <div class="stat-card">
              <span class="stat-label">Dañado</span>
              <div class="stat-value stat-value-sm font-mono">
                {{ formatoMoneda(m.totales.costoDanado) }}
              </div>
            </div>
            <div class="stat-card">
              <span class="stat-label">Perdido</span>
              <div class="stat-value stat-value-sm font-mono">
                {{ formatoMoneda(m.totales.costoPerdido) }}
              </div>
            </div>
          </div>

          <p class="text-muted mb-16">
            La pérdida es una estimación: se calcula con el costo actual de cada producto, no con el
            costo del momento de la salida.
          </p>

          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>SKU</th>
                  <th class="text-right">Unidades</th>
                  <th class="text-right">Dañado</th>
                  <th class="text-right">Perdido</th>
                  <th class="text-right">Costo unitario</th>
                  <th class="text-right">Pérdida</th>
                </tr>
              </thead>
              <tbody>
                @for (item of m.items; track item.producto_id) {
                  <tr>
                    <td>{{ item.nombre }}</td>
                    <td class="font-mono">{{ item.sku }}</td>
                    <td class="text-right font-mono">
                      {{ formatoCantidad(item.unidades) }} {{ item.unidad_medida }}
                    </td>
                    <td class="text-right font-mono">{{ formatoCantidad(item.unidadesDanado) }}</td>
                    <td class="text-right font-mono">{{ formatoCantidad(item.unidadesPerdido) }}</td>
                    <td class="text-right font-mono">{{ formatoMoneda(item.precio_compra) }}</td>
                    <td class="text-right font-mono text-danger">{{ formatoMoneda(item.costo) }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7">
                      <div class="empty-state">
                        <span class="empty-state-icon" aria-hidden="true">✓</span>
                        <span class="empty-state-title">Sin mermas</span>
                        <span class="empty-state-text">
                          No hay productos dañados ni perdidos en el periodo seleccionado.
                        </span>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      } @else if (pestana() === 'rotacion') {
        @if (rotacion(); as r) {
          <div class="grid grid-cards mb-16">
            <div class="stat-card">
              <span class="stat-label">Productos</span>
              <div class="stat-value">{{ r.totales.productos }}</div>
            </div>
            <div class="stat-card">
              <span class="stat-label">Con movimiento</span>
              <div class="stat-value stat-value-sm">{{ r.totales.conMovimiento }}</div>
            </div>
            <div class="stat-card">
              <span class="stat-label">Sin movimiento</span>
              <div class="stat-value stat-value-sm text-danger">{{ r.totales.sinMovimiento }}</div>
            </div>
            <div class="stat-card">
              <span class="stat-label">Unidades vendidas</span>
              <div class="stat-value stat-value-sm font-mono">
                {{ formatoCantidad(r.totales.unidades) }}
              </div>
            </div>
            <div class="stat-card">
              <span class="stat-label">Ingreso estimado</span>
              <div class="stat-value stat-value-sm font-mono">
                {{ formatoMoneda(r.totales.ingreso) }}
              </div>
            </div>
          </div>

          <p class="text-muted mb-16">
            Un producto "sin movimiento" no registra ventas en el periodo. El ingreso se estima con
            el precio de venta actual de cada producto.
          </p>

          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>SKU</th>
                  <th>Categoría</th>
                  <th class="text-right">Existencias</th>
                  <th class="text-right">Unidades vendidas</th>
                  <th class="text-right">Ingreso</th>
                  <th>Última venta</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (item of r.items; track item.producto_id) {
                  <tr>
                    <td>{{ item.nombre }}</td>
                    <td class="font-mono">{{ item.sku }}</td>
                    <td>{{ item.categoria || '—' }}</td>
                    <td class="text-right font-mono">
                      {{ formatoCantidad(item.stock) }} {{ item.unidad_medida }}
                    </td>
                    <td class="text-right font-mono">
                      {{ formatoCantidad(item.unidadesVendidas) }}
                    </td>
                    <td class="text-right font-mono">{{ formatoMoneda(item.ingreso) }}</td>
                    <td>{{ fechaCorta(item.ultimaVenta) }}</td>
                    <td>
                      <span [class]="item.sinMovimiento ? 'badge badge-agotado' : 'badge badge-disponible'">
                        <span class="badge-dot"></span>{{ item.sinMovimiento ? 'Sin movimiento' : 'Con movimiento' }}
                      </span>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8">
                      <div class="empty-state">
                        <span class="empty-state-icon" aria-hidden="true">▤</span>
                        <span class="empty-state-title">Sin productos</span>
                        <span class="empty-state-text">
                          No hay productos que coincidan con el filtro.
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
        @if (reposicion(); as lista) {
          <div class="grid grid-cards mb-16">
            <div class="stat-card">
              <span class="stat-label">Productos a reponer</span>
              <div class="stat-value">{{ lista.totales.productos }}</div>
            </div>
            <div class="stat-card">
              <span class="stat-label">Agotados</span>
              <div class="stat-value stat-value-sm text-danger">{{ lista.totales.agotados }}</div>
            </div>
            <div class="stat-card">
              <span class="stat-label">Bajo stock</span>
              <div class="stat-value stat-value-sm">{{ lista.totales.bajoStock }}</div>
            </div>
            <div class="stat-card">
              <span class="stat-label">Costo estimado de reposición</span>
              <div class="stat-value stat-value-sm font-mono">
                {{ formatoMoneda(lista.totales.costoEstimado) }}
              </div>
            </div>
          </div>

          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Producto</th>
                  <th>Proveedor</th>
                  <th class="text-right">Existencias</th>
                  <th class="text-right">Stock mínimo</th>
                  <th class="text-right">Sugerido</th>
                  <th class="text-right">Costo unitario</th>
                  <th class="text-right">Costo estimado</th>
                </tr>
              </thead>
              <tbody>
                @for (item of lista.items; track item.id) {
                  <tr>
                    <td class="font-mono">{{ item.sku }}</td>
                    <td>{{ item.nombre }}</td>
                    <td>{{ item.proveedor || '—' }}</td>
                    <td class="text-right font-mono">
                      {{ formatoCantidad(item.stock) }} {{ item.unidad_medida }}
                    </td>
                    <td class="text-right font-mono">{{ formatoCantidad(item.stock_minimo) }}</td>
                    <td class="text-right font-mono font-bold">
                      {{ formatoCantidad(item.sugerido) }} {{ item.unidad_medida }}
                    </td>
                    <td class="text-right font-mono">{{ formatoMoneda(item.precio_compra) }}</td>
                    <td class="text-right font-mono">{{ formatoMoneda(item.costo_estimado) }}</td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8">
                      <div class="empty-state">
                        <span class="empty-state-icon" aria-hidden="true">✓</span>
                        <span class="empty-state-title">Todo en orden</span>
                        <span class="empty-state-text">
                          No hay productos con stock bajo ni agotados.
                        </span>
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
  readonly fechaCorta = fechaCorta;

  // Filas de relleno que se muestran mientras carga el reporte.
  readonly filasSkeleton = [1, 2, 3, 4, 5];

  pestana = signal<Pestana>('ventas');
  desde = signal(primerDiaMesInput());
  hasta = signal(hoyInput());
  soloBajoStock = signal(false);
  incluirInactivos = signal(false);
  soloSinMovimiento = signal(false);

  ventas = signal<ReporteVentas | null>(null);
  inventario = signal<ReporteInventario | null>(null);
  reposicion = signal<ListaReposicion | null>(null);
  mermas = signal<ReporteMermas | null>(null);
  rotacion = signal<ReporteRotacion | null>(null);

  cargando = signal(false);
  error = signal<string | null>(null);
  exportando = signal(false);

  ngOnInit(): void {
    this.cargar();
  }

  sinDatos(): boolean {
    if (this.pestana() === 'ventas') return (this.ventas()?.items.length ?? 0) === 0;
    if (this.pestana() === 'inventario') return (this.inventario()?.items.length ?? 0) === 0;
    if (this.pestana() === 'mermas') return (this.mermas()?.items.length ?? 0) === 0;
    if (this.pestana() === 'rotacion') return (this.rotacion()?.items.length ?? 0) === 0;
    return (this.reposicion()?.items.length ?? 0) === 0;
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

  alternarSinMovimiento(evento: Event): void {
    this.soloSinMovimiento.set((evento.target as HTMLInputElement).checked);
    this.cargarRotacion();
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
    } else if (this.pestana() === 'inventario') {
      this.cargarInventario();
    } else if (this.pestana() === 'mermas') {
      this.cargarMermas();
    } else if (this.pestana() === 'rotacion') {
      this.cargarRotacion();
    } else {
      this.cargarReposicion();
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

  private cargarReposicion(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.reporteService.inventario({ soloBajoStock: true }).subscribe({
      next: (res) => {
        this.reposicion.set(construirListaReposicion(res.data.items));
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e, 'No se pudo cargar la lista de reposición.'));
        this.cargando.set(false);
      },
    });
  }

  private cargarMermas(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.reporteService
      .mermas({ desde: inicioDiaISO(this.desde()), hasta: finDiaISO(this.hasta()) })
      .subscribe({
        next: (res) => {
          this.mermas.set(res.data);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e, 'No se pudo cargar el reporte de mermas.'));
          this.cargando.set(false);
        },
      });
  }

  private cargarRotacion(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.reporteService
      .rotacion({
        desde: inicioDiaISO(this.desde()),
        hasta: finDiaISO(this.hasta()),
        soloSinMovimiento: this.soloSinMovimiento(),
      })
      .subscribe({
        next: (res) => {
          this.rotacion.set(res.data);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e, 'No se pudo cargar el reporte de rotación.'));
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
      } else if (this.pestana() === 'inventario') {
        await this.exportarInventario();
      } else if (this.pestana() === 'mermas') {
        await this.exportarMermas();
      } else if (this.pestana() === 'rotacion') {
        await this.exportarRotacion();
      } else {
        await this.exportarReposicion();
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
      graficos: [
        {
          titulo: 'Top productos por ingreso',
          datos: [...v.items]
            .sort((a, b) => numero(b.ingreso) - numero(a.ingreso))
            .slice(0, 8)
            .map((item) => ({ etiqueta: item.nombre, valor: numero(item.ingreso) })),
          formatoValor: formatoMoneda,
        },
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

    const porCategoria = new Map<string, number>();
    for (const item of r.items) {
      const categoria = item.categoria ?? 'Sin categoría';
      porCategoria.set(categoria, (porCategoria.get(categoria) ?? 0) + numero(item.valor_venta));
    }
    const datosCategoria = [...porCategoria.entries()]
      .map(([etiqueta, valor]) => ({ etiqueta, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8);

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
      graficos: [
        {
          titulo: 'Valor a precio de venta por categoría',
          datos: datosCategoria,
          formatoValor: formatoMoneda,
        },
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

  private async exportarReposicion(): Promise<void> {
    const lista = this.reposicion();
    if (!lista) return;

    const grupos = agruparPorProveedor(lista.items);
    const columnas = [
      { encabezado: 'SKU', clave: 'sku' },
      { encabezado: 'Producto', clave: 'nombre' },
      { encabezado: 'Existencias', clave: 'stock', alineacion: 'right' as const },
      { encabezado: 'Stock mínimo', clave: 'stock_minimo', alineacion: 'right' as const },
      { encabezado: 'Sugerido', clave: 'sugerido', alineacion: 'right' as const },
      { encabezado: 'Costo unitario', clave: 'precio_compra', alineacion: 'right' as const },
      { encabezado: 'Costo estimado', clave: 'costo_estimado', alineacion: 'right' as const },
    ];

    const documento: DocumentoPdf = {
      titulo: 'Lista de reposición',
      subtitulo: 'Productos con stock bajo o agotado',
      meta: [
        `Generado el ${fechaHoraArchivo()}`,
        'La cantidad sugerida repone hasta el doble del stock mínimo.',
      ],
      resumen: [
        { etiqueta: 'Productos', valor: String(lista.totales.productos) },
        { etiqueta: 'Agotados', valor: String(lista.totales.agotados) },
        { etiqueta: 'Bajo stock', valor: String(lista.totales.bajoStock) },
        { etiqueta: 'Costo estimado', valor: formatoMoneda(lista.totales.costoEstimado) },
      ],
      graficos: [
        {
          titulo: 'Costo estimado por proveedor',
          datos: grupos.map((grupo) => ({
            etiqueta: grupo.proveedor,
            valor: grupo.items.reduce((total, item) => total + item.costo_estimado, 0),
          })),
          formatoValor: formatoMoneda,
        },
      ],
      secciones: grupos.map((grupo) => ({
        titulo: grupo.proveedor,
        columnas,
        filas: grupo.items.map((item) => this.filaReposicion(item)),
      })),
      nombreArchivo: `lista-reposicion-${fechaArchivo()}.pdf`,
      horizontal: true,
    };

    await generarPdf(documento);
  }

  private async exportarMermas(): Promise<void> {
    const m = this.mermas();
    if (!m) return;

    const documento: DocumentoPdf = {
      titulo: 'Reporte de mermas',
      subtitulo: 'Productos dañados y perdidos',
      meta: [
        `Periodo: ${this.desde()} a ${this.hasta()}`,
        'La pérdida se estima con el costo actual de cada producto.',
      ],
      resumen: [
        { etiqueta: 'Operaciones', valor: String(m.totales.operaciones) },
        { etiqueta: 'Unidades', valor: formatoCantidad(m.totales.unidades) },
        { etiqueta: 'Pérdida total', valor: formatoMoneda(m.totales.costo) },
        { etiqueta: 'Dañado', valor: formatoMoneda(m.totales.costoDanado) },
        { etiqueta: 'Perdido', valor: formatoMoneda(m.totales.costoPerdido) },
      ],
      graficos: [
        {
          titulo: 'Pérdida por producto',
          datos: [...m.items]
            .sort((a, b) => numero(b.costo) - numero(a.costo))
            .slice(0, 8)
            .map((item) => ({ etiqueta: item.nombre, valor: numero(item.costo) })),
          formatoValor: formatoMoneda,
        },
        {
          titulo: 'Pérdida por motivo',
          datos: [
            { etiqueta: 'Dañado', valor: numero(m.totales.costoDanado) },
            { etiqueta: 'Perdido', valor: numero(m.totales.costoPerdido) },
          ],
          formatoValor: formatoMoneda,
        },
      ],
      secciones: [
        {
          titulo: 'Detalle por producto',
          columnas: [
            { encabezado: 'Producto', clave: 'nombre' },
            { encabezado: 'SKU', clave: 'sku' },
            { encabezado: 'Unidades', clave: 'unidades', alineacion: 'right' },
            { encabezado: 'Dañado', clave: 'unidadesDanado', alineacion: 'right' },
            { encabezado: 'Perdido', clave: 'unidadesPerdido', alineacion: 'right' },
            { encabezado: 'Costo unitario', clave: 'precio_compra', alineacion: 'right' },
            { encabezado: 'Pérdida', clave: 'costo', alineacion: 'right' },
          ],
          filas: m.items.map((item) => ({
            nombre: item.nombre,
            sku: item.sku,
            unidades: `${formatoCantidad(item.unidades)} ${item.unidad_medida}`,
            unidadesDanado: formatoCantidad(item.unidadesDanado),
            unidadesPerdido: formatoCantidad(item.unidadesPerdido),
            precio_compra: formatoMoneda(item.precio_compra),
            costo: formatoMoneda(item.costo),
          })),
        },
      ],
      nombreArchivo: `reporte-mermas-${fechaArchivo()}.pdf`,
      horizontal: true,
    };

    await generarPdf(documento);
  }

  private async exportarRotacion(): Promise<void> {
    const r = this.rotacion();
    if (!r) return;

    const columnas = [
      { encabezado: 'Producto', clave: 'nombre' },
      { encabezado: 'SKU', clave: 'sku' },
      { encabezado: 'Categoría', clave: 'categoria' },
      { encabezado: 'Existencias', clave: 'stock', alineacion: 'right' as const },
      { encabezado: 'Unidades vendidas', clave: 'unidadesVendidas', alineacion: 'right' as const },
      { encabezado: 'Ingreso', clave: 'ingreso', alineacion: 'right' as const },
      { encabezado: 'Última venta', clave: 'ultimaVenta' },
    ];

    const sinMovimiento = r.items.filter((item) => item.sinMovimiento);

    const documento: DocumentoPdf = {
      titulo: 'Reporte de rotación',
      subtitulo: 'Ventas por producto en el periodo',
      meta: [
        `Periodo: ${this.desde()} a ${this.hasta()}`,
        this.soloSinMovimiento()
          ? 'Filtro: solo sin movimiento'
          : 'Incluye todos los productos activos',
      ],
      resumen: [
        { etiqueta: 'Productos', valor: String(r.totales.productos) },
        { etiqueta: 'Con movimiento', valor: String(r.totales.conMovimiento) },
        { etiqueta: 'Sin movimiento', valor: String(r.totales.sinMovimiento) },
        { etiqueta: 'Unidades', valor: formatoCantidad(r.totales.unidades) },
        { etiqueta: 'Ingreso estimado', valor: formatoMoneda(r.totales.ingreso) },
      ],
      graficos: [
        {
          titulo: 'Top productos por unidades vendidas',
          datos: r.items
            .filter((item) => !item.sinMovimiento)
            .slice(0, 8)
            .map((item) => ({ etiqueta: item.nombre, valor: numero(item.unidadesVendidas) })),
          formatoValor: formatoCantidad,
        },
      ],
      secciones: [
        {
          titulo: 'Detalle por producto',
          columnas,
          filas: r.items.map((item) => this.filaRotacion(item)),
        },
        ...(sinMovimiento.length
          ? [
              {
                titulo: 'Productos sin movimiento',
                columnas,
                filas: sinMovimiento.map((item) => this.filaRotacion(item)),
              },
            ]
          : []),
      ],
      nombreArchivo: `reporte-rotacion-${fechaArchivo()}.pdf`,
      horizontal: true,
    };

    await generarPdf(documento);
  }

  private filaRotacion(item: ReporteRotacionItem): Record<string, string> {
    return {
      nombre: item.nombre,
      sku: item.sku,
      categoria: item.categoria ?? '—',
      stock: `${formatoCantidad(item.stock)} ${item.unidad_medida}`,
      unidadesVendidas: formatoCantidad(item.unidadesVendidas),
      ingreso: formatoMoneda(item.ingreso),
      ultimaVenta: fechaCorta(item.ultimaVenta),
    };
  }

  private filaReposicion(item: ItemReposicion): Record<string, string> {
    return {
      sku: item.sku,
      nombre: item.nombre,
      stock: `${formatoCantidad(item.stock)} ${item.unidad_medida}`,
      stock_minimo: formatoCantidad(item.stock_minimo),
      sugerido: `${formatoCantidad(item.sugerido)} ${item.unidad_medida}`,
      precio_compra: formatoMoneda(item.precio_compra),
      costo_estimado: formatoMoneda(item.costo_estimado),
    };
  }
}
