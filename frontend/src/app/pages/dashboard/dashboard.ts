import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { DashboardService } from '../../services/dashboard.service';
import { ProductoService } from '../../services/producto.service';
import { AlertaService } from '../../services/alerta.service';
import { mensajeError } from '../../core/api-error.utils';
import { fechaHora } from '../../core/fecha.utils';
import { fechaArchivo, fechaHoraArchivo, generarPdf } from '../../core/pdf.utils';
import {
  estadoStock,
  etiquetaEstadoStock,
  formatoCantidad,
  formatoMoneda,
  ganancia,
  margenGanancia,
  numero,
} from '../../core/formato.utils';
import { ResumenDashboard } from '../../models';

// Panel principal: totales, ganancia potencial, alertas de stock y los
// movimientos mas recientes.
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Hola, {{ usuario()?.nombres ?? 'bienvenido' }}</h1>
          <p class="page-subtitle">Resumen general de tu inventario.</p>
        </div>
        <div class="actions">
          <button type="button" class="btn-uber btn-uber-outline" [disabled]="exportando()" (click)="exportar()">
            {{ exportando() ? 'Generando…' : 'Exportar PDF' }}
          </button>
          <a routerLink="/perfil" class="btn-uber btn-uber-outline">Mi perfil</a>
        </div>
      </div>

      @if (error()) {
        <div class="alert alert-danger mb-16">{{ error() }}</div>
      }

      @if (cargando()) {
        <div class="card">
          <div class="table-empty"><span class="spinner"></span></div>
        </div>
      } @else if (resumen(); as r) {
        <div class="grid grid-cards mb-16">
          <div class="stat-card">
            <span class="stat-label">Productos activos</span>
            <div class="stat-value">{{ r.totales.productos }}</div>
          </div>
          <div class="stat-card">
            <span class="stat-label">Unidades en existencia</span>
            <div class="stat-value stat-value-sm font-mono">
              {{ formatoCantidad(r.inventario.unidades) }}
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-label">Valor a precio de venta</span>
            <div class="stat-value stat-value-sm font-mono">
              {{ formatoMoneda(r.inventario.valorVenta) }}
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-label">Ganancia potencial</span>
            <div class="stat-value stat-value-sm font-mono ganancia-positiva">
              {{ formatoMoneda(gananciaPotencial(r)) }}
            </div>
          </div>
        </div>

        <div class="card mb-16">
          <div class="card-header">
            <h2 class="section-title">Flujo de inventario</h2>
            <span class="text-muted">Cómo se mueve tu stock</span>
          </div>
          <div class="flujo">
            <div class="flujo-nodo">
              <div class="flujo-nodo-cabecera">
                <span class="flujo-icono" aria-hidden="true">↑</span>
                <span class="flujo-etiqueta">Compras</span>
              </div>
              <span class="flujo-valor font-mono">+{{ formatoCantidad(r.flujo.unidadesEntrada) }}</span>
              <span class="flujo-nota">
                {{ r.flujo.entradas }} operación(es) · reabastecimientos
              </span>
            </div>

            <div class="flujo-flecha" aria-hidden="true">→</div>

            <div class="flujo-nodo flujo-nodo-destacado">
              <div class="flujo-nodo-cabecera">
                <span class="flujo-icono" aria-hidden="true">▤</span>
                <span class="flujo-etiqueta">Inventario actual</span>
              </div>
              <span class="flujo-valor font-mono">{{ formatoCantidad(r.inventario.unidades) }}</span>
              <span class="flujo-nota">
                unidades disponibles · {{ formatoMoneda(r.inventario.valorCompra) }} a costo
              </span>
            </div>

            <div class="flujo-flecha" aria-hidden="true">→</div>

            <div class="flujo-nodo">
              <div class="flujo-nodo-cabecera">
                <span class="flujo-icono" aria-hidden="true">↓</span>
                <span class="flujo-etiqueta">Ventas</span>
              </div>
              <span class="flujo-valor font-mono">−{{ formatoCantidad(r.flujo.unidadesSalida) }}</span>
              <span class="flujo-nota">
                {{ r.flujo.salidas }} operación(es) · {{ r.flujo.ajustes }} ajuste(s)
              </span>
            </div>
          </div>
        </div>

        <div class="dashboard-columnas mb-16">
          <div class="card">
            <div class="card-header">
              <h2 class="section-title">Valor del inventario</h2>
            </div>
            <div class="dashboard-metricas">
              <div>
                <span class="stat-label">Unidades en existencia</span>
                <div class="stat-value stat-value-sm font-mono">
                  {{ formatoCantidad(r.inventario.unidades) }}
                </div>
              </div>
              <div>
                <span class="stat-label">Valor a precio de compra</span>
                <div class="stat-value stat-value-sm font-mono">
                  {{ formatoMoneda(r.inventario.valorCompra) }}
                </div>
              </div>
              <div>
                <span class="stat-label">Valor a precio de venta</span>
                <div class="stat-value stat-value-sm font-mono">
                  {{ formatoMoneda(r.inventario.valorVenta) }}
                </div>
              </div>
              <div>
                <span class="stat-label">Ganancia potencial</span>
                <div class="stat-value stat-value-sm font-mono ganancia-positiva">
                  {{ formatoMoneda(gananciaPotencial(r)) }}
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h2 class="section-title">Alertas de stock</h2>
            </div>
            @if (r.alertas.total === 0) {
              <p class="text-muted">No hay productos con stock bajo. Todo en orden.</p>
            } @else {
              <div class="dashboard-metricas">
                <div>
                  <span class="stat-label">Agotados</span>
                  <div class="stat-value stat-value-sm text-danger">{{ r.alertas.agotados }}</div>
                </div>
                <div>
                  <span class="stat-label">Bajo stock</span>
                  <div class="stat-value stat-value-sm">{{ r.alertas.bajoStock }}</div>
                </div>
              </div>
              <ul class="lista-alertas mt-16">
                @for (a of r.alertas.items.slice(0, 5); track a.id) {
                  <li>
                    <span class="font-bold">{{ a.nombre }}</span>
                    <span class="text-muted font-mono">({{ a.sku }})</span>
                    <span class="alert-faltante">
                      {{ formatoCantidad(a.stock) }} / {{ formatoCantidad(a.stock_minimo) }}
                      {{ a.unidad_medida }}
                    </span>
                  </li>
                }
              </ul>
              <div class="flex gap-8 mt-16 flex-wrap">
                <a
                  routerLink="/productos"
                  [queryParams]="{ bajoStock: 1 }"
                  class="btn-uber btn-uber-outline btn-sm"
                >
                  Ver todos ({{ r.alertas.total }})
                </a>
                <a routerLink="/movimientos" class="btn-uber btn-uber-outline btn-sm">Reabastecer</a>
              </div>
            }
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h2 class="section-title">Movimientos recientes</h2>
            <a routerLink="/movimientos" class="btn-uber btn-uber-outline btn-sm">Ver historial</a>
          </div>

          @if (r.movimientosRecientes.length === 0) {
            <p class="text-muted">Aún no hay movimientos registrados.</p>
          } @else {
            <div class="table-wrapper">
              <table class="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Producto</th>
                    <th class="text-right">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  @for (m of r.movimientosRecientes; track m.id) {
                    <tr>
                      <td class="font-mono">{{ fechaHora(m.fecha) }}</td>
                      <td>
                        @switch (m.tipo) {
                          @case ('ENTRADA') {
                            <span class="badge badge-entrada"><span class="badge-dot"></span>↑ Compra</span>
                          }
                          @case ('SALIDA') {
                            <span class="badge badge-salida"><span class="badge-dot"></span>↓ Venta</span>
                          }
                          @default {
                            <span class="badge badge-ajuste"><span class="badge-dot"></span>⇄ Ajuste</span>
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
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private productoService = inject(ProductoService);
  private alertas = inject(AlertaService);

  readonly formatoMoneda = formatoMoneda;
  readonly formatoCantidad = formatoCantidad;
  readonly fechaHora = fechaHora;
  readonly numero = numero;

  usuario = this.auth.currentUser;

  resumen = signal<ResumenDashboard | null>(null);
  cargando = signal(false);
  error = signal<string | null>(null);
  exportando = signal(false);

  ngOnInit(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.dashboardService.resumen().subscribe({
      next: (res) => {
        this.resumen.set(res.data);
        this.alertas.sincronizar(res.data.alertas);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e, 'No se pudo cargar el resumen.'));
        this.cargando.set(false);
      },
    });
  }

  gananciaPotencial(r: ResumenDashboard): number {
    return ganancia(r.inventario.valorVenta, r.inventario.valorCompra);
  }

  // Exporta el inventario completo a un PDF con las mismas columnas que la
  // tabla de productos.
  exportar(): void {
    this.exportando.set(true);
    this.productoService.listar({ incluirInactivos: true }).subscribe({
      next: async (res) => {
        const productos = res.data.items;
        const filas = productos.map((p) => ({
          sku: p.sku,
          producto: p.nombre,
          unidad: p.unidad_medida,
          costo: formatoMoneda(p.precio_compra),
          venta: formatoMoneda(p.precio_venta),
          ganancia: formatoMoneda(ganancia(p.precio_venta, p.precio_compra)),
          margen: `${formatoCantidad(margenGanancia(p.precio_venta, p.precio_compra))} %`,
          existencias: formatoCantidad(p.stock),
          valor: formatoMoneda(numero(p.stock) * numero(p.precio_venta)),
          estado: etiquetaEstadoStock(estadoStock(p.stock, p.stock_minimo)),
        }));

        const valorTotal = productos.reduce(
          (total, p) => total + numero(p.stock) * numero(p.precio_venta),
          0,
        );

        try {
          await generarPdf({
            titulo: 'Inventario de productos',
            meta: [`Generado el ${fechaHoraArchivo()}`],
            resumen: [
              { etiqueta: 'Productos', valor: String(productos.length) },
              { etiqueta: 'Valor a precio de venta', valor: formatoMoneda(valorTotal) },
            ],
            secciones: [
              {
                columnas: [
                  { encabezado: 'SKU', clave: 'sku' },
                  { encabezado: 'Producto', clave: 'producto' },
                  { encabezado: 'Unidad', clave: 'unidad' },
                  { encabezado: 'Costo', clave: 'costo', alineacion: 'right' },
                  { encabezado: 'Precio venta', clave: 'venta', alineacion: 'right' },
                  { encabezado: 'Ganancia', clave: 'ganancia', alineacion: 'right' },
                  { encabezado: 'Margen', clave: 'margen', alineacion: 'right' },
                  { encabezado: 'Existencias', clave: 'existencias', alineacion: 'right' },
                  { encabezado: 'Valor venta', clave: 'valor', alineacion: 'right' },
                  { encabezado: 'Estado', clave: 'estado' },
                ],
                filas,
              },
            ],
            nombreArchivo: `inventario-${fechaArchivo()}.pdf`,
            horizontal: true,
          });
        } catch {
          this.error.set('No se pudo generar el PDF del inventario.');
        } finally {
          this.exportando.set(false);
        }
      },
      error: (e) => {
        this.error.set(mensajeError(e, 'No se pudo exportar el inventario.'));
        this.exportando.set(false);
      },
    });
  }
}
