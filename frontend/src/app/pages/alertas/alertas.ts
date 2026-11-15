import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AlertasDashboard } from '../../models';
import { AlertaService } from '../../services/alerta.service';
import { mensajeError } from '../../core/api-error.utils';
import { formatoCantidad } from '../../core/formato.utils';

// Alertas de stock: productos agotados o por debajo del minimo configurado.
@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Alertas de stock</h1>
          <p class="page-subtitle">Productos agotados o por debajo del stock mínimo.</p>
        </div>
      </div>

      @if (error()) {
        <div class="alert alert-danger mb-16">{{ error() }}</div>
      }

      @if (cargando()) {
        <div class="card">
          <div class="table-empty"><span class="spinner"></span></div>
        </div>
      } @else if (alertas(); as a) {
        <div class="grid grid-cards mb-16">
          <div class="stat-card">
            <span class="stat-label">Agotados</span>
            <div class="stat-value text-danger">{{ a.agotados }}</div>
          </div>
          <div class="stat-card">
            <span class="stat-label">Bajo stock</span>
            <div class="stat-value">{{ a.bajoStock }}</div>
          </div>
          <div class="stat-card">
            <span class="stat-label">Total de alertas</span>
            <div class="stat-value">{{ a.total }}</div>
          </div>
        </div>

        @if (a.total === 0) {
          <div class="card">
            <div class="card-header">
              <h2 class="section-title">Sin alertas</h2>
              <span class="badge badge-disponible"><span class="badge-dot"></span>Todo en orden</span>
            </div>
            <p class="text-muted">
              Ningún producto activo está agotado ni por debajo de su stock mínimo.
            </p>
          </div>
        } @else {
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th class="text-right">Existencia</th>
                  <th class="text-right">Mínimo</th>
                  <th class="text-right">Faltante</th>
                  <th class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (item of a.items; track item.id) {
                  <tr>
                    <td>
                      @if (item.estado === 'AGOTADO') {
                        <span class="badge badge-agotado"><span class="badge-dot"></span>Agotado</span>
                      } @else {
                        <span class="badge badge-bajo"><span class="badge-dot"></span>Bajo stock</span>
                      }
                    </td>
                    <td>
                      <span class="font-bold">{{ item.nombre }}</span>
                      <span class="text-muted font-mono">({{ item.sku }})</span>
                    </td>
                    <td class="text-muted">{{ item.categoria?.nombre || '—' }}</td>
                    <td class="text-right font-mono">
                      {{ formatoCantidad(item.stock) }} {{ item.unidad_medida }}
                    </td>
                    <td class="text-right font-mono">
                      {{ formatoCantidad(item.stock_minimo) }} {{ item.unidad_medida }}
                    </td>
                    <td class="text-right font-mono text-danger">
                      {{ formatoCantidad(item.faltante) }} {{ item.unidad_medida }}
                    </td>
                    <td class="text-right">
                      <div class="actions">
                        <a routerLink="/entradas" class="btn-uber btn-uber-outline btn-sm">Reabastecer</a>
                        <a routerLink="/ajustes" class="btn-uber btn-uber-outline btn-sm">Ajustar</a>
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
export class AlertasComponent implements OnInit {
  private alertaService = inject(AlertaService);

  readonly formatoCantidad = formatoCantidad;

  alertas = signal<AlertasDashboard | null>(null);
  cargando = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.alertaService.listar().subscribe({
      next: (res) => {
        this.alertas.set(res.data);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e, 'No se pudieron cargar las alertas.'));
        this.cargando.set(false);
      },
    });
  }
}
