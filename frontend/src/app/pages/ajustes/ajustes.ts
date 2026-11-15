import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Ajuste, Producto } from '../../models';
import { AjusteService } from '../../services/ajuste.service';
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
  selector: 'app-ajustes',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Ajustes de inventario</h1>
          <p class="page-subtitle">Corrige las existencias tras un conteo físico.</p>
        </div>
        <button type="button" class="btn-uber" (click)="alternarForm()">
          {{ mostrarForm() ? 'Cerrar' : 'Registrar ajuste' }}
        </button>
      </div>

      @if (mostrarForm()) {
        <div class="card mb-16">
          <div class="card-header">
            <h2 class="section-title">Nuevo ajuste</h2>
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
                  <option [value]="p.id">{{ p.nombre }} ({{ p.sku }})</option>
                }
              </select>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label" for="existencias_fisicas">Existencias físicas contadas</label>
                <input
                  id="existencias_fisicas"
                  type="number"
                  class="form-control"
                  step="0.001"
                  min="0"
                  formControlName="existencias_fisicas"
                />
                @if (campoInvalido('existencias_fisicas')) {
                  <span class="form-error">Ingresa un número mayor o igual a 0.</span>
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

            @if (productoSeleccionado(); as ps) {
              <div class="alert">
                <span>
                  Existencias en el sistema: {{ formatoCantidad(ps.stock) }} {{ ps.unidad_medida }} ·
                  Diferencia: <strong>{{ diferencia() >= 0 ? '+' : '' }}{{ formatoCantidad(diferencia()) }}</strong>
                </span>
              </div>
            }

            <div class="form-group mt-16">
              <label class="form-label" for="observaciones">Observaciones (opcional)</label>
              <textarea id="observaciones" class="form-control" rows="2" formControlName="observaciones"></textarea>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-uber btn-uber-outline" (click)="alternarForm()">Cancelar</button>
              <button type="submit" class="btn-uber" [disabled]="guardando()">
                @if (guardando()) {
                  <span class="spinner"></span>
                }
                {{ guardando() ? 'Registrando…' : 'Registrar ajuste' }}
              </button>
            </div>
          </form>
        </div>
      }

      @if (error()) {
        <div class="alert alert-danger mb-16">{{ error() }}</div>
      }

      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th class="text-right">Antes</th>
              <th class="text-right">Contado</th>
              <th class="text-right">Diferencia</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            @if (cargando()) {
              <tr>
                <td colspan="6" class="table-empty"><span class="spinner"></span></td>
              </tr>
            } @else if (ajustes().length === 0) {
              <tr>
                <td colspan="6" class="table-empty">No hay ajustes registrados.</td>
              </tr>
            } @else {
              @for (a of ajustes(); track a.id) {
                <tr>
                  <td class="font-mono">{{ fechaHora(a.fecha) }}</td>
                  <td>
                    {{ a.producto?.nombre || 'Producto' }}
                    <span class="text-muted font-mono">({{ a.producto?.sku }})</span>
                  </td>
                  <td class="text-right font-mono">{{ formatoCantidad(a.existencias_anteriores) }}</td>
                  <td class="text-right font-mono">{{ formatoCantidad(a.existencias_fisicas) }}</td>
                  <td class="text-right font-mono" [class.text-danger]="numero(a.diferencia) < 0">
                    {{ numero(a.diferencia) > 0 ? '+' : '' }}{{ formatoCantidad(a.diferencia) }}
                  </td>
                  <td><span class="badge badge-neutral">{{ etiquetaMotivo(a.motivo) }}</span></td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class AjustesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private ajusteService = inject(AjusteService);
  private productoService = inject(ProductoService);

  readonly formatoCantidad = formatoCantidad;
  readonly fechaHora = fechaHora;
  readonly numero = numero;

  readonly motivos: OpcionMotivo[] = [
    { valor: 'CONTEO_FISICO', etiqueta: 'Conteo físico' },
    { valor: 'ERROR_REGISTRO', etiqueta: 'Error de registro' },
    { valor: 'MERMA', etiqueta: 'Merma' },
    { valor: 'DEVOLUCION', etiqueta: 'Devolución' },
    { valor: 'OTRO', etiqueta: 'Otro' },
  ];

  ajustes = signal<Ajuste[]>([]);
  productos = signal<Producto[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);

  mostrarForm = signal(false);
  guardando = signal(false);
  errorForm = signal<string | null>(null);
  exito = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    producto_id: ['', [Validators.required]],
    existencias_fisicas: ['0', [Validators.required]],
    motivo: ['CONTEO_FISICO', [Validators.required]],
    fecha: [ahoraLocalInput()],
    observaciones: [''],
  });

  productoSeleccionado = signal<Producto | null>(null);
  diferencia = computed(() => {
    const p = this.productoSeleccionado();
    return numero(this.form.getRawValue().existencias_fisicas) - (p ? numero(p.stock) : 0);
  });

  ngOnInit(): void {
    this.form.get('producto_id')!.valueChanges.subscribe((id) => {
      this.productoSeleccionado.set(this.productos().find((p) => p.id === id) ?? null);
    });

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

    this.ajusteService.listar({}).subscribe({
      next: (res) => {
        this.ajustes.set(res.data.items);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e, 'No se pudieron cargar los ajustes.'));
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
    const valores = this.form.getRawValue();
    if (this.form.invalid || numero(valores.existencias_fisicas) < 0) {
      this.form.markAllAsTouched();
      this.errorForm.set('Selecciona un producto e ingresa las existencias contadas.');
      return;
    }

    if (this.productoSeleccionado() && this.diferencia() === 0) {
      this.errorForm.set('El conteo coincide con el sistema; no hay ajuste que registrar.');
      return;
    }

    this.guardando.set(true);
    this.errorForm.set(null);
    this.exito.set(null);

    this.ajusteService
      .registrar({
        producto_id: valores.producto_id,
        existencias_fisicas: valores.existencias_fisicas,
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
              ? 'El ajuste ya había sido registrado.'
              : 'Ajuste registrado exitosamente.',
          );
          this.form.reset({
            producto_id: '',
            existencias_fisicas: '0',
            motivo: 'CONTEO_FISICO',
            fecha: ahoraLocalInput(),
            observaciones: '',
          });
          this.productoSeleccionado.set(null);
          this.cargarProductos();
          this.cargar();
        },
        error: (e) => {
          this.errorForm.set(mensajeError(e, 'No se pudo registrar el ajuste.'));
          this.guardando.set(false);
        },
      });
  }
}
