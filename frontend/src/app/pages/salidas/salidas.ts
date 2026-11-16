import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Producto, Salida } from '../../models';
import { SalidaService } from '../../services/salida.service';
import { ProductoService } from '../../services/producto.service';
import { mensajeError } from '../../core/api-error.utils';
import { ahoraLocalInput, aISO, fechaHora } from '../../core/fecha.utils';
import { formatoCantidad, numero } from '../../core/formato.utils';
import { nuevoUuid } from '../../core/uuid.utils';

interface OpcionMotivo {
  valor: string;
  etiqueta: string;
}

@Component({
  selector: 'app-salidas',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Salidas de inventario</h1>
          <p class="page-subtitle">Registra ventas, mermas, uso interno u otras salidas.</p>
        </div>
        <button type="button" class="btn-uber" (click)="alternarForm()">
          {{ mostrarForm() ? 'Cerrar' : 'Registrar salida' }}
        </button>
      </div>

      <div class="proceso">
        <span class="direccion direccion-baja">↓ Baja el stock</span>
        <span class="proceso-paso"><span class="proceso-num">1</span> Elige el producto y la cantidad</span>
        <span class="proceso-sep">→</span>
        <span class="proceso-paso"><span class="proceso-num">2</span> Indica el motivo (venta, merma, uso…)</span>
        <span class="proceso-sep">→</span>
        <span class="proceso-paso"><span class="proceso-num">3</span> Se descuenta y queda en el historial</span>
      </div>

      @if (mostrarForm()) {
        <div class="card mb-16">
          <div class="card-header">
            <h2 class="section-title">Nueva salida</h2>
          </div>

          @if (errorForm()) {
            <div class="alert alert-danger mb-16">{{ errorForm() }}</div>
          }
          @if (exito()) {
            <div class="alert alert-success mb-16">{{ exito() }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="registrar()">
            <div class="form-group">
              <label class="form-label" for="producto_id">Producto</label>
              <select id="producto_id" class="form-select form-control" formControlName="producto_id">
                <option value="">Selecciona un producto…</option>
                @for (p of productos(); track p.id) {
                  <option [value]="p.id">
                    {{ p.nombre }} ({{ p.sku }}) — {{ formatoCantidad(p.stock) }} {{ p.unidad_medida }}
                  </option>
                }
              </select>
              @if (productoSeleccionado(); as ps) {
                <span class="form-hint">
                  Disponible: {{ formatoCantidad(ps.stock) }} {{ ps.unidad_medida }}
                </span>
              }
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label" for="cantidad">Cantidad</label>
                <input
                  id="cantidad"
                  type="number"
                  class="form-control"
                  step="0.001"
                  min="0"
                  formControlName="cantidad"
                />
                @if (campoInvalido('cantidad')) {
                  <span class="form-error">Ingresa una cantidad mayor a 0.</span>
                }
              </div>
              <div class="form-group">
                <label class="form-label" for="motivo">Motivo</label>
                <select id="motivo" class="form-select form-control" formControlName="motivo">
                  @for (m of motivos; track m.valor) {
                    <option [value]="m.valor">{{ m.etiqueta }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="fecha">Fecha</label>
                <input id="fecha" type="datetime-local" class="form-control" formControlName="fecha" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="observaciones">Observaciones (opcional)</label>
              <textarea id="observaciones" class="form-control" rows="2" formControlName="observaciones"></textarea>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-uber btn-uber-outline" (click)="alternarForm()">Cancelar</button>
              <button type="submit" class="btn-uber" [disabled]="guardando()">
                @if (guardando()) {
                  <span class="spinner"></span>
                }
                {{ guardando() ? 'Registrando…' : 'Registrar salida' }}
              </button>
            </div>
          </form>
        </div>
      }

      @if (error()) {
        <div class="alert alert-danger mb-16">{{ error() }}</div>
      }

      <div class="toolbar">
        <select class="form-select form-control" [formControl]="filtroProducto">
          <option value="">Todos los productos</option>
          @for (p of productos(); track p.id) {
            <option [value]="p.id">{{ p.nombre }}</option>
          }
        </select>
        <select class="form-select form-control" [formControl]="filtroMotivo">
          <option value="">Todos los motivos</option>
          @for (m of motivos; track m.valor) {
            <option [value]="m.valor">{{ m.etiqueta }}</option>
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
              <th>Producto</th>
              <th class="text-right">Cantidad</th>
              <th>Motivo</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            @if (cargando()) {
              <tr>
                <td colspan="5" class="table-empty"><span class="spinner"></span></td>
              </tr>
            } @else if (salidas().length === 0) {
              <tr>
                <td colspan="5" class="table-empty">No hay salidas registradas.</td>
              </tr>
            } @else {
              @for (s of salidas(); track s.id) {
                <tr>
                  <td class="font-mono">{{ fechaHora(s.fecha) }}</td>
                  <td>
                    {{ s.producto?.nombre || 'Producto' }}
                    <span class="text-muted font-mono">({{ s.producto?.sku }})</span>
                  </td>
                  <td class="text-right font-mono">
                    {{ formatoCantidad(s.cantidad) }} {{ s.producto?.unidad_medida }}
                  </td>
                  <td><span class="badge badge-neutral">{{ etiquetaMotivo(s.motivo) }}</span></td>
                  <td class="text-muted">{{ s.observaciones || '—' }}</td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class SalidasComponent implements OnInit {
  private fb = inject(FormBuilder);
  private salidaService = inject(SalidaService);
  private productoService = inject(ProductoService);

  readonly formatoCantidad = formatoCantidad;
  readonly fechaHora = fechaHora;

  readonly motivos: OpcionMotivo[] = [
    { valor: 'VENTA', etiqueta: 'Venta' },
    { valor: 'DANADO', etiqueta: 'Dañado' },
    { valor: 'PERDIDO', etiqueta: 'Perdido' },
    { valor: 'USO_INTERNO', etiqueta: 'Uso interno' },
    { valor: 'AJUSTE', etiqueta: 'Ajuste' },
    { valor: 'OTRO', etiqueta: 'Otro' },
  ];

  salidas = signal<Salida[]>([]);
  productos = signal<Producto[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);

  mostrarForm = signal(false);
  guardando = signal(false);
  errorForm = signal<string | null>(null);
  exito = signal<string | null>(null);

  filtroProducto = this.fb.nonNullable.control('');
  filtroMotivo = this.fb.nonNullable.control('');
  desde = this.fb.nonNullable.control('');
  hasta = this.fb.nonNullable.control('');

  form = this.fb.nonNullable.group({
    producto_id: ['', [Validators.required]],
    cantidad: ['1', [Validators.required]],
    motivo: ['VENTA', [Validators.required]],
    fecha: [ahoraLocalInput()],
    observaciones: [''],
  });

  productoSeleccionado = signal<Producto | null>(null);

  ngOnInit(): void {
    this.form.get('producto_id')!.valueChanges.subscribe((id) => {
      this.productoSeleccionado.set(this.productos().find((p) => p.id === id) ?? null);
    });
    this.filtroProducto.valueChanges.subscribe(() => this.cargar());
    this.filtroMotivo.valueChanges.subscribe(() => this.cargar());
    this.desde.valueChanges.subscribe(() => this.cargar());
    this.hasta.valueChanges.subscribe(() => this.cargar());

    this.cargarProductos();
    this.cargar();
  }

  cargarProductos(): void {
    this.productoService.listar({}).subscribe({
      next: (res) => {
        this.productos.set(res.data.items);
        const actual = this.form.get('producto_id')!.value;
        if (actual) {
          this.productoSeleccionado.set(res.data.items.find((p) => p.id === actual) ?? null);
        }
      },
    });
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.salidaService
      .listar({
        productoId: this.filtroProducto.value || undefined,
        motivo: this.filtroMotivo.value || undefined,
        desde: aISO(this.desde.value)?.slice(0, 10),
        hasta: this.hasta.value ? `${this.hasta.value}T23:59:59.999` : undefined,
      })
      .subscribe({
        next: (res) => {
          this.salidas.set(res.data.items);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e, 'No se pudieron cargar las salidas.'));
          this.cargando.set(false);
        },
      });
  }

  alternarForm(): void {
    this.mostrarForm.update((v) => !v);
    this.errorForm.set(null);
    this.exito.set(null);
  }

  campoInvalido(campo: string): boolean {
    const control = this.form.get(campo);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  etiquetaMotivo(motivo: string): string {
    return this.motivos.find((m) => m.valor === motivo)?.etiqueta ?? motivo;
  }

  registrar(): void {
    if (this.form.invalid || numero(this.form.getRawValue().cantidad) <= 0) {
      this.form.markAllAsTouched();
      this.errorForm.set('Selecciona un producto e ingresa una cantidad mayor a 0.');
      return;
    }

    const valores = this.form.getRawValue();
    this.guardando.set(true);
    this.errorForm.set(null);
    this.exito.set(null);

    this.salidaService
      .registrar({
        producto_id: valores.producto_id,
        cantidad: valores.cantidad,
        motivo: valores.motivo,
        observaciones: valores.observaciones || null,
        fecha: aISO(valores.fecha) ?? null,
        client_request_id: nuevoUuid(),
      })
      .subscribe({
        next: (res) => {
          this.guardando.set(false);
          this.exito.set(
            res.data.idempotente
              ? 'La salida ya había sido registrada.'
              : 'Salida registrada exitosamente.',
          );
          this.form.reset({
            producto_id: '',
            cantidad: '1',
            motivo: 'VENTA',
            fecha: ahoraLocalInput(),
            observaciones: '',
          });
          this.productoSeleccionado.set(null);
          this.cargarProductos();
          this.cargar();
        },
        error: (e) => {
          this.errorForm.set(mensajeError(e, 'No se pudo registrar la salida.'));
          this.guardando.set(false);
        },
      });
  }
}
