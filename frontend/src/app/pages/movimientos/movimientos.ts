import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Movimiento, Producto } from '../../models';
import { MovimientoService } from '../../services/movimiento.service';
import { ProductoService } from '../../services/producto.service';
import { mensajeError } from '../../core/api-error.utils';
import { aISO, fechaHora } from '../../core/fecha.utils';
import { formatoCantidad, numero } from '../../core/formato.utils';

interface OpcionTipo {
  valor: string;
  etiqueta: string;
}

@Component({
  selector: 'app-movimientos',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Historial de movimientos</h1>
          <p class="page-subtitle">Kardex de solo lectura: entradas, salidas y ajustes.</p>
        </div>
      </div>

      @if (error()) {
        <div class="alert alert-danger mb-16">{{ error() }}</div>
      }

      <div class="toolbar">
        <select class="form-select form-control" [formControl]="filtroProducto">
          <option value="">Todos los productos</option>
          @for (p of productos(); track p.id) {
            <option [value]="p.id">{{ p.nombre }} ({{ p.sku }})</option>
          }
        </select>
        <select class="form-select form-control" [formControl]="filtroTipo">
          <option value="">Todos los tipos</option>
          @for (t of tipos; track t.valor) {
            <option [value]="t.valor">{{ t.etiqueta }}</option>
          }
        </select>
        <input type="date" class="form-control" [formControl]="desde" aria-label="Desde" />
        <input type="date" class="form-control" [formControl]="hasta" aria-label="Hasta" />
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
            @if (cargando()) {
              <tr>
                <td colspan="6" class="table-empty"><span class="spinner"></span></td>
              </tr>
            } @else if (movimientos().length === 0) {
              <tr>
                <td colspan="6" class="table-empty">No hay movimientos registrados.</td>
              </tr>
            } @else {
              @for (m of movimientos(); track m.id) {
                <tr>
                  <td class="font-mono">{{ fechaHora(m.fecha) }}</td>
                  <td>
                    @switch (m.tipo) {
                      @case ('ENTRADA') {
                        <span class="badge badge-entrada"><span class="badge-dot"></span>↑ Entrada</span>
                      }
                      @case ('SALIDA') {
                        <span class="badge badge-salida"><span class="badge-dot"></span>↓ Salida</span>
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

      @if (total() > 0) {
        <div class="paginacion">
          <span class="text-muted">
            Mostrando {{ movimientos().length }} de {{ total() }} movimientos
          </span>
          <div class="paginacion-controles">
            <button
              type="button"
              class="btn-uber btn-uber-outline btn-sm"
              [disabled]="pagina() <= 1"
              (click)="cambiarPagina(-1)"
            >
              Anterior
            </button>
            <span class="font-mono">Página {{ pagina() }}</span>
            <button
              type="button"
              class="btn-uber btn-uber-outline btn-sm"
              [disabled]="pagina() * limite >= total()"
              (click)="cambiarPagina(1)"
            >
              Siguiente
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class MovimientosComponent implements OnInit {
  private fb = inject(FormBuilder);
  private movimientoService = inject(MovimientoService);
  private productoService = inject(ProductoService);

  readonly formatoCantidad = formatoCantidad;
  readonly fechaHora = fechaHora;
  readonly numero = numero;

  readonly tipos: OpcionTipo[] = [
    { valor: 'ENTRADA', etiqueta: 'Entrada' },
    { valor: 'SALIDA', etiqueta: 'Salida' },
    { valor: 'AJUSTE', etiqueta: 'Ajuste' },
  ];

  readonly limite = 50;

  movimientos = signal<Movimiento[]>([]);
  productos = signal<Producto[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);

  pagina = signal(1);
  total = signal(0);

  filtroProducto = this.fb.nonNullable.control('');
  filtroTipo = this.fb.nonNullable.control('');
  desde = this.fb.nonNullable.control('');
  hasta = this.fb.nonNullable.control('');

  ngOnInit(): void {
    this.filtroProducto.valueChanges.subscribe(() => this.reiniciar());
    this.filtroTipo.valueChanges.subscribe(() => this.reiniciar());
    this.desde.valueChanges.subscribe(() => this.reiniciar());
    this.hasta.valueChanges.subscribe(() => this.reiniciar());

    this.productoService.listar({}).subscribe({
      next: (res) => this.productos.set(res.data.items),
    });

    this.cargar();
  }

  reiniciar(): void {
    this.pagina.set(1);
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.movimientoService
      .listar({
        productoId: this.filtroProducto.value || undefined,
        tipo: this.filtroTipo.value || undefined,
        desde: aISO(this.desde.value)?.slice(0, 10),
        hasta: this.hasta.value ? `${this.hasta.value}T23:59:59.999` : undefined,
        page: this.pagina(),
        limit: this.limite,
      })
      .subscribe({
        next: (res) => {
          this.movimientos.set(res.data.items);
          this.total.set(res.data.total);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e, 'No se pudo cargar el historial de movimientos.'));
          this.cargando.set(false);
        },
      });
  }

  cambiarPagina(delta: number): void {
    const nueva = this.pagina() + delta;
    if (nueva < 1) return;
    if (delta > 0 && this.pagina() * this.limite >= this.total()) return;
    this.pagina.set(nueva);
    this.cargar();
  }
}
