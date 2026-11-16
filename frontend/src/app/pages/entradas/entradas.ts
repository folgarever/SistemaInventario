import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Entrada, Producto, Proveedor } from '../../models';
import { EntradaService } from '../../services/entrada.service';
import { ProductoService } from '../../services/producto.service';
import { ProveedorService } from '../../services/proveedor.service';
import { mensajeError } from '../../core/api-error.utils';
import { ahoraLocalInput, aISO, fechaHora } from '../../core/fecha.utils';
import { formatoCantidad, formatoMoneda, numero } from '../../core/formato.utils';
import { nuevoUuid } from '../../core/uuid.utils';

@Component({
  selector: 'app-entradas',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Entradas de inventario</h1>
          <p class="page-subtitle">Registra compras o reabastecimientos de uno o varios productos.</p>
        </div>
        <button type="button" class="btn-uber" (click)="alternarForm()">
          {{ mostrarForm() ? 'Cerrar' : 'Registrar entrada' }}
        </button>
      </div>

      <div class="proceso">
        <span class="direccion direccion-sube">↑ Sube el stock</span>
        <span class="proceso-paso"><span class="proceso-num">1</span> Elige el proveedor y los productos</span>
        <span class="proceso-sep">→</span>
        <span class="proceso-paso"><span class="proceso-num">2</span> Indica cantidad y costo</span>
        <span class="proceso-sep">→</span>
        <span class="proceso-paso"><span class="proceso-num">3</span> Se suma al inventario y al historial</span>
      </div>

      @if (mostrarForm()) {
        <div class="card mb-16">
          <div class="card-header">
            <h2 class="section-title">Nueva entrada</h2>
          </div>

          @if (errorForm()) {
            <div class="alert alert-danger mb-16">{{ errorForm() }}</div>
          }
          @if (exito()) {
            <div class="alert alert-success mb-16">{{ exito() }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="registrar()">
            <div class="form-seccion">
              <span class="form-seccion-num">1</span>
              <h3 class="section-title">Datos de la entrada</h3>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label" for="proveedor_id">Proveedor</label>
                <select id="proveedor_id" class="form-select form-control" formControlName="proveedor_id">
                  <option value="">Sin proveedor</option>
                  @for (p of proveedores(); track p.id) {
                    <option [value]="p.id">{{ p.nombre }}</option>
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

            <div class="form-seccion">
              <span class="form-seccion-num">2</span>
              <h3 class="section-title">Productos de la entrada</h3>
            </div>

            <div class="lineas" formArrayName="items">
              @for (linea of items.controls; track $index; let i = $index) {
                <div class="linea-entrada" [formGroupName]="i">
                  <select class="form-select form-control" formControlName="producto_id" (change)="alCambiarProducto(i)">
                    <option value="">Selecciona un producto…</option>
                    @for (p of productos(); track p.id) {
                      <option [value]="p.id">{{ p.nombre }} ({{ p.sku }})</option>
                    }
                  </select>
                  <input
                    type="number"
                    class="form-control"
                    step="0.001"
                    min="0"
                    placeholder="Cantidad"
                    formControlName="cantidad"
                  />
                  <input
                    type="number"
                    class="form-control"
                    step="0.01"
                    min="0"
                    placeholder="Costo unitario"
                    formControlName="costo_unitario"
                  />
                  <span class="linea-subtotal font-mono">{{ formatoMoneda(subtotales()[i] || 0) }}</span>
                  <button
                    type="button"
                    class="btn-uber btn-uber-danger btn-sm"
                    [disabled]="items.length <= 1"
                    (click)="quitarLinea(i)"
                    aria-label="Quitar línea"
                  >
                    ✕
                  </button>
                </div>
              }
            </div>

            <button type="button" class="btn-uber btn-uber-outline btn-sm mt-8" (click)="agregarLinea()">
              + Agregar producto
            </button>

            <div class="total-entrada">
              <span class="stat-label">Total</span>
              <span class="total-valor font-mono">{{ formatoMoneda(total()) }}</span>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-uber btn-uber-outline" (click)="alternarForm()">Cancelar</button>
              <button type="submit" class="btn-uber" [disabled]="guardando()">
                @if (guardando()) {
                  <span class="spinner"></span>
                }
                {{ guardando() ? 'Registrando…' : 'Registrar entrada' }}
              </button>
            </div>
          </form>
        </div>
      }

      @if (error()) {
        <div class="alert alert-danger mb-16">{{ error() }}</div>
      }

      <div class="toolbar">
        <select class="form-select form-control" [formControl]="filtroProveedor">
          <option value="">Todos los proveedores</option>
          @for (p of proveedores(); track p.id) {
            <option [value]="p.id">{{ p.nombre }}</option>
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
              <th>Proveedor</th>
              <th class="text-right">Productos</th>
              <th class="text-right">Total</th>
              <th class="text-right">Detalle</th>
            </tr>
          </thead>
          <tbody>
            @if (cargando()) {
              <tr>
                <td colspan="5" class="table-empty"><span class="spinner"></span></td>
              </tr>
            } @else if (entradas().length === 0) {
              <tr>
                <td colspan="5" class="table-empty">No hay entradas registradas.</td>
              </tr>
            } @else {
              @for (e of entradas(); track e.id) {
                <tr>
                  <td class="font-mono">{{ fechaHora(e.fecha) }}</td>
                  <td>{{ e.proveedor?.nombre || '—' }}</td>
                  <td class="text-right">{{ e.detalles?.length || 0 }}</td>
                  <td class="text-right font-mono">{{ formatoMoneda(e.total) }}</td>
                  <td class="text-right">
                    <button
                      type="button"
                      class="btn-uber btn-uber-outline btn-sm"
                      (click)="alternarDetalle(e.id)"
                    >
                      {{ expandido() === e.id ? 'Ocultar' : 'Ver' }}
                    </button>
                  </td>
                </tr>
                @if (expandido() === e.id) {
                  <tr>
                    <td colspan="5" class="detalle-fila">
                      <table class="table detalle-tabla">
                        <thead>
                          <tr>
                            <th>Producto</th>
                            <th class="text-right">Cantidad</th>
                            <th class="text-right">Costo unitario</th>
                            <th class="text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (d of e.detalles || []; track d.id) {
                            <tr>
                              <td>
                                {{ d.producto?.nombre || 'Producto' }}
                                <span class="text-muted font-mono">({{ d.producto?.sku }})</span>
                              </td>
                              <td class="text-right font-mono">
                                {{ formatoCantidad(d.cantidad) }} {{ d.producto?.unidad_medida }}
                              </td>
                              <td class="text-right font-mono">{{ formatoMoneda(d.costo_unitario) }}</td>
                              <td class="text-right font-mono">{{ formatoMoneda(d.subtotal) }}</td>
                            </tr>
                          }
                        </tbody>
                      </table>
                      @if (e.observaciones) {
                        <p class="text-muted mt-8">Observaciones: {{ e.observaciones }}</p>
                      }
                    </td>
                  </tr>
                }
              }
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class EntradasComponent implements OnInit {
  private fb = inject(FormBuilder);
  private entradaService = inject(EntradaService);
  private productoService = inject(ProductoService);
  private proveedorService = inject(ProveedorService);

  readonly formatoMoneda = formatoMoneda;
  readonly formatoCantidad = formatoCantidad;
  readonly fechaHora = fechaHora;

  entradas = signal<Entrada[]>([]);
  productos = signal<Producto[]>([]);
  proveedores = signal<Proveedor[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);

  mostrarForm = signal(false);
  guardando = signal(false);
  errorForm = signal<string | null>(null);
  exito = signal<string | null>(null);
  expandido = signal<string | null>(null);

  filtroProveedor = this.fb.nonNullable.control('');
  desde = this.fb.nonNullable.control('');
  hasta = this.fb.nonNullable.control('');

  form = this.fb.nonNullable.group({
    proveedor_id: [''],
    fecha: [ahoraLocalInput()],
    observaciones: [''],
    items: this.fb.array([this.crearLinea()]),
  });

  private valorForm = signal(this.form.getRawValue());
  subtotales = computed(() =>
    this.valorForm().items.map((it) => numero(it.cantidad) * numero(it.costo_unitario)),
  );
  total = computed(() => this.subtotales().reduce((a, b) => a + b, 0));

  get items() {
    return this.form.controls.items;
  }

  private crearLinea() {
    return this.fb.nonNullable.group({
      producto_id: ['', [Validators.required]],
      cantidad: ['1', [Validators.required]],
      costo_unitario: ['0', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.form.valueChanges.subscribe(() => this.valorForm.set(this.form.getRawValue()));
    this.filtroProveedor.valueChanges.subscribe(() => this.cargar());
    this.desde.valueChanges.subscribe(() => this.cargar());
    this.hasta.valueChanges.subscribe(() => this.cargar());

    this.cargarCombos();
    this.cargar();
  }

  cargarCombos(): void {
    this.productoService.listar({}).subscribe({
      next: (res) => this.productos.set(res.data.items),
    });
    this.proveedorService.listar({}).subscribe({
      next: (res) => this.proveedores.set(res.data.items),
    });
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.entradaService
      .listar({
        proveedorId: this.filtroProveedor.value || undefined,
        desde: aISO(this.desde.value)?.slice(0, 10),
        hasta: this.hasta.value ? `${this.hasta.value}T23:59:59.999` : undefined,
      })
      .subscribe({
        next: (res) => {
          this.entradas.set(res.data.items);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e, 'No se pudieron cargar las entradas.'));
          this.cargando.set(false);
        },
      });
  }

  alternarForm(): void {
    this.mostrarForm.update((v) => !v);
    this.errorForm.set(null);
    this.exito.set(null);
  }

  agregarLinea(): void {
    this.items.push(this.crearLinea());
  }

  quitarLinea(i: number): void {
    if (this.items.length > 1) {
      this.items.removeAt(i);
    }
  }

  alCambiarProducto(i: number): void {
    const linea = this.items.at(i);
    const producto = this.productos().find((p) => p.id === linea.get('producto_id')!.value);
    if (producto) {
      linea.get('costo_unitario')!.setValue(String(numero(producto.precio_compra)));
    }
  }

  alternarDetalle(id: string): void {
    this.expandido.update((actual) => (actual === id ? null : id));
  }

  registrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorForm.set('Revisa las líneas: cada producto debe tener cantidad y costo.');
      return;
    }

    const valores = this.form.getRawValue();
    const items = valores.items
      .filter((it) => it.producto_id)
      .map((it) => ({
        producto_id: it.producto_id,
        cantidad: it.cantidad,
        costo_unitario: it.costo_unitario,
      }));

    if (items.length === 0) {
      this.errorForm.set('Agrega al menos un producto a la entrada.');
      return;
    }

    this.guardando.set(true);
    this.errorForm.set(null);
    this.exito.set(null);

    this.entradaService
      .registrar({
        proveedor_id: valores.proveedor_id || null,
        observaciones: valores.observaciones || null,
        fecha: aISO(valores.fecha) ?? null,
        client_request_id: nuevoUuid(),
        items,
      })
      .subscribe({
        next: (res) => {
          this.guardando.set(false);
          this.exito.set(
            res.data.idempotente
              ? 'La entrada ya había sido registrada.'
              : 'Entrada registrada exitosamente.',
          );
          this.form.reset({
            proveedor_id: '',
            fecha: ahoraLocalInput(),
            observaciones: '',
          });
          this.items.clear();
          this.items.push(this.crearLinea());
          this.cargarCombos();
          this.cargar();
        },
        error: (e) => {
          this.errorForm.set(mensajeError(e, 'No se pudo registrar la entrada.'));
          this.guardando.set(false);
        },
      });
  }
}
