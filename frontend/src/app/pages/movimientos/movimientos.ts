import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Movimiento, Producto, Proveedor } from '../../models';
import { MovimientoService } from '../../services/movimiento.service';
import { ProductoService } from '../../services/producto.service';
import { ProveedorService } from '../../services/proveedor.service';
import { EntradaService } from '../../services/entrada.service';
import { SalidaService } from '../../services/salida.service';
import { AjusteService } from '../../services/ajuste.service';
import { AlertaService } from '../../services/alerta.service';
import { mensajeError } from '../../core/api-error.utils';
import { ahoraLocalInput, aISO, fechaHora } from '../../core/fecha.utils';
import { formatoCantidad, formatoMoneda, numero } from '../../core/formato.utils';
import { nuevoUuid } from '../../core/uuid.utils';

interface Opcion {
  valor: string;
  etiqueta: string;
}

type ModoForm = 'compra' | 'venta' | 'ajuste';

@Component({
  selector: 'app-movimientos',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Movimientos</h1>
          <p class="page-subtitle">Registra compras y ventas, ajusta el conteo y revisa el historial.</p>
        </div>
        <div class="actions">
          <button
            type="button"
            class="btn-uber btn-uber-outline"
            [class.is-active]="modoForm() === 'compra'"
            (click)="abrirForm('compra')"
          >
            ↑ Registrar compra
          </button>
          <button
            type="button"
            class="btn-uber btn-uber-outline"
            [class.is-active]="modoForm() === 'venta'"
            (click)="abrirForm('venta')"
          >
            ↓ Registrar venta
          </button>
          <button
            type="button"
            class="btn-uber btn-uber-outline"
            [class.is-active]="modoForm() === 'ajuste'"
            (click)="abrirForm('ajuste')"
          >
            ⇄ Ajustar existencias
          </button>
        </div>
      </div>

      <div class="proceso">
        <span class="proceso-paso"><span class="proceso-num">↑</span> La compra sube el stock</span>
        <span class="proceso-sep">·</span>
        <span class="proceso-paso"><span class="proceso-num">↓</span> La venta lo baja</span>
        <span class="proceso-sep">·</span>
        <span class="proceso-paso"><span class="proceso-num">⇄</span> El ajuste corrige el conteo</span>
      </div>

      @if (errorForm()) {
        <div class="alert alert-danger mb-16">{{ errorForm() }}</div>
      }
      @if (exito()) {
        <div class="alert alert-success mb-16">{{ exito() }}</div>
      }

      <!-- COMPRA -->
      @if (modoForm() === 'compra') {
        <div class="card mb-16">
          <div class="card-header">
            <h2 class="section-title">Registrar compra</h2>
            <span class="badge badge-entrada"><span class="badge-dot"></span>↑ Sube el stock</span>
          </div>

          <form [formGroup]="formCompra" (ngSubmit)="registrarCompra()">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label" for="c_proveedor">Proveedor</label>
                <select id="c_proveedor" class="form-select form-control" formControlName="proveedor_id">
                  <option value="">Sin proveedor</option>
                  @for (p of proveedores(); track p.id) {
                    <option [value]="p.id">{{ p.nombre }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="c_fecha">Fecha</label>
                <input id="c_fecha" type="datetime-local" class="form-control" formControlName="fecha" />
              </div>
            </div>

            <div class="form-seccion">
              <span class="form-seccion-num">1</span>
              <h3 class="section-title">Productos que compras</h3>
            </div>

            <div class="lineas" formArrayName="items">
              @for (linea of itemsCompra.controls; track $index; let i = $index) {
                <div class="linea-entrada" [formGroupName]="i">
                  <select
                    class="form-select form-control"
                    formControlName="producto_id"
                    (change)="alCambiarProductoCompra(i)"
                  >
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
                  <span class="linea-subtotal font-mono">{{ formatoMoneda(subtotalesCompra()[i] || 0) }}</span>
                  <button
                    type="button"
                    class="btn-uber btn-uber-danger btn-sm"
                    [disabled]="itemsCompra.length <= 1"
                    (click)="quitarLineaCompra(i)"
                    aria-label="Quitar línea"
                  >
                    ✕
                  </button>
                </div>
              }
            </div>

            <button type="button" class="btn-uber btn-uber-outline btn-sm mt-8" (click)="agregarLineaCompra()">
              + Agregar producto
            </button>

            <div class="total-entrada">
              <span class="stat-label">Total de la compra</span>
              <span class="total-valor font-mono">{{ formatoMoneda(totalCompra()) }}</span>
            </div>

            <div class="form-group mt-16">
              <label class="form-label" for="c_obs">Observaciones (opcional)</label>
              <textarea id="c_obs" class="form-control" rows="2" formControlName="observaciones"></textarea>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-uber btn-uber-outline" (click)="cerrarForm()">Cancelar</button>
              <button type="submit" class="btn-uber" [disabled]="guardando()">
                @if (guardando()) {
                  <span class="spinner"></span>
                }
                {{ guardando() ? 'Registrando…' : 'Registrar compra' }}
              </button>
            </div>
          </form>
        </div>
      }

      <!-- VENTA -->
      @if (modoForm() === 'venta') {
        <div class="card mb-16">
          <div class="card-header">
            <h2 class="section-title">Registrar venta</h2>
            <span class="badge badge-salida"><span class="badge-dot"></span>↓ Baja el stock</span>
          </div>

          <form [formGroup]="formVenta" (ngSubmit)="registrarVenta()">
            <div class="form-group">
              <label class="form-label" for="v_producto">Producto</label>
              <select id="v_producto" class="form-select form-control" formControlName="producto_id">
                <option value="">Selecciona un producto…</option>
                @for (p of productos(); track p.id) {
                  <option [value]="p.id">
                    {{ p.nombre }} ({{ p.sku }}) — {{ formatoCantidad(p.stock) }} {{ p.unidad_medida }}
                  </option>
                }
              </select>
              @if (productoVenta(); as ps) {
                <span class="form-hint">
                  Disponible: {{ formatoCantidad(ps.stock) }} {{ ps.unidad_medida }} ·
                  Precio de venta: {{ formatoMoneda(ps.precio_venta) }}
                </span>
              }
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label" for="v_cantidad">Cantidad</label>
                <input
                  id="v_cantidad"
                  type="number"
                  class="form-control"
                  step="0.001"
                  min="0"
                  formControlName="cantidad"
                />
              </div>
              <div class="form-group">
                <label class="form-label" for="v_motivo">Motivo</label>
                <select id="v_motivo" class="form-select form-control" formControlName="motivo">
                  @for (m of motivosVenta; track m.valor) {
                    <option [value]="m.valor">{{ m.etiqueta }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="v_fecha">Fecha</label>
                <input id="v_fecha" type="datetime-local" class="form-control" formControlName="fecha" />
              </div>
            </div>

            @if (productoVenta(); as ps) {
              <div class="alert">
                <span>
                  Total de la venta: <strong>{{ formatoMoneda(totalVenta()) }}</strong>
                  ({{ formatoCantidad(formVenta.getRawValue().cantidad) }} {{ ps.unidad_medida }})
                </span>
              </div>
            }

            <div class="form-group mt-16">
              <label class="form-label" for="v_obs">Observaciones (opcional)</label>
              <textarea id="v_obs" class="form-control" rows="2" formControlName="observaciones"></textarea>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-uber btn-uber-outline" (click)="cerrarForm()">Cancelar</button>
              <button type="submit" class="btn-uber" [disabled]="guardando()">
                @if (guardando()) {
                  <span class="spinner"></span>
                }
                {{ guardando() ? 'Registrando…' : 'Registrar venta' }}
              </button>
            </div>
          </form>
        </div>
      }

      <!-- AJUSTE -->
      @if (modoForm() === 'ajuste') {
        <div class="card mb-16">
          <div class="card-header">
            <h2 class="section-title">Ajustar existencias</h2>
            <span class="badge badge-ajuste"><span class="badge-dot"></span>⇄ Corrige el stock</span>
          </div>

          <form [formGroup]="formAjuste" (ngSubmit)="registrarAjuste()">
            <div class="form-group">
              <label class="form-label" for="a_producto">Producto</label>
              <select id="a_producto" class="form-select form-control" formControlName="producto_id">
                <option value="">Selecciona un producto…</option>
                @for (p of productos(); track p.id) {
                  <option [value]="p.id">{{ p.nombre }} ({{ p.sku }})</option>
                }
              </select>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label" for="a_fisicas">Existencias contadas</label>
                <input
                  id="a_fisicas"
                  type="number"
                  class="form-control"
                  step="0.001"
                  min="0"
                  formControlName="existencias_fisicas"
                />
              </div>
              <div class="form-group">
                <label class="form-label" for="a_motivo">Motivo</label>
                <select id="a_motivo" class="form-select form-control" formControlName="motivo">
                  @for (m of motivosAjuste; track m.valor) {
                    <option [value]="m.valor">{{ m.etiqueta }}</option>
                  }
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="a_fecha">Fecha</label>
                <input id="a_fecha" type="datetime-local" class="form-control" formControlName="fecha" />
              </div>
            </div>

            @if (productoAjuste(); as ps) {
              <div class="alert">
                <span>
                  En el sistema: {{ formatoCantidad(ps.stock) }} {{ ps.unidad_medida }} · Diferencia:
                  <strong>{{ diferenciaAjuste() >= 0 ? '+' : '' }}{{ formatoCantidad(diferenciaAjuste()) }}</strong>
                </span>
              </div>
            }

            <div class="form-group mt-16">
              <label class="form-label" for="a_obs">Observaciones (opcional)</label>
              <textarea id="a_obs" class="form-control" rows="2" formControlName="observaciones"></textarea>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-uber btn-uber-outline" (click)="cerrarForm()">Cancelar</button>
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
  private proveedorService = inject(ProveedorService);
  private entradaService = inject(EntradaService);
  private salidaService = inject(SalidaService);
  private ajusteService = inject(AjusteService);
  private alertas = inject(AlertaService);

  readonly formatoCantidad = formatoCantidad;
  readonly formatoMoneda = formatoMoneda;
  readonly fechaHora = fechaHora;
  readonly numero = numero;

  readonly tipos: Opcion[] = [
    { valor: 'ENTRADA', etiqueta: 'Compra' },
    { valor: 'SALIDA', etiqueta: 'Venta' },
    { valor: 'AJUSTE', etiqueta: 'Ajuste' },
  ];

  readonly motivosVenta: Opcion[] = [
    { valor: 'VENTA', etiqueta: 'Venta' },
    { valor: 'DANADO', etiqueta: 'Dañado' },
    { valor: 'PERDIDO', etiqueta: 'Perdido' },
    { valor: 'USO_INTERNO', etiqueta: 'Uso interno' },
    { valor: 'OTRO', etiqueta: 'Otro' },
  ];

  readonly motivosAjuste: Opcion[] = [
    { valor: 'CONTEO_FISICO', etiqueta: 'Conteo físico' },
    { valor: 'ERROR_REGISTRO', etiqueta: 'Error de registro' },
    { valor: 'MERMA', etiqueta: 'Merma' },
    { valor: 'DEVOLUCION', etiqueta: 'Devolución' },
    { valor: 'OTRO', etiqueta: 'Otro' },
  ];

  readonly limite = 50;

  movimientos = signal<Movimiento[]>([]);
  productos = signal<Producto[]>([]);
  proveedores = signal<Proveedor[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);

  pagina = signal(1);
  total = signal(0);

  modoForm = signal<ModoForm | null>(null);
  guardando = signal(false);
  errorForm = signal<string | null>(null);
  exito = signal<string | null>(null);

  filtroProducto = this.fb.nonNullable.control('');
  filtroTipo = this.fb.nonNullable.control('');
  desde = this.fb.nonNullable.control('');
  hasta = this.fb.nonNullable.control('');

  // --- Compra (multi-producto) ---
  formCompra = this.fb.nonNullable.group({
    proveedor_id: [''],
    fecha: [ahoraLocalInput()],
    observaciones: [''],
    items: this.fb.array([this.crearLineaCompra()]),
  });

  private valorCompra = signal(this.formCompra.getRawValue());
  subtotalesCompra = computed(() =>
    this.valorCompra().items.map((it) => numero(it.cantidad) * numero(it.costo_unitario)),
  );
  totalCompra = computed(() => this.subtotalesCompra().reduce((a, b) => a + b, 0));

  get itemsCompra() {
    return this.formCompra.controls.items;
  }

  // --- Venta ---
  formVenta = this.fb.nonNullable.group({
    producto_id: ['', [Validators.required]],
    cantidad: ['1', [Validators.required]],
    motivo: ['VENTA', [Validators.required]],
    fecha: [ahoraLocalInput()],
    observaciones: [''],
  });
  productoVenta = signal<Producto | null>(null);
  private valorVenta = signal(this.formVenta.getRawValue());
  totalVenta = computed(() => {
    const p = this.productoVenta();
    return numero(this.valorVenta().cantidad) * numero(p?.precio_venta ?? 0);
  });

  // --- Ajuste ---
  formAjuste = this.fb.nonNullable.group({
    producto_id: ['', [Validators.required]],
    existencias_fisicas: ['0', [Validators.required]],
    motivo: ['CONTEO_FISICO', [Validators.required]],
    fecha: [ahoraLocalInput()],
    observaciones: [''],
  });
  productoAjuste = signal<Producto | null>(null);
  diferenciaAjuste = computed(() => {
    const p = this.productoAjuste();
    return numero(this.formAjuste.getRawValue().existencias_fisicas) - (p ? numero(p.stock) : 0);
  });

  private crearLineaCompra() {
    return this.fb.nonNullable.group({
      producto_id: ['', [Validators.required]],
      cantidad: ['1', [Validators.required]],
      costo_unitario: ['0', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.formCompra.valueChanges.subscribe(() => this.valorCompra.set(this.formCompra.getRawValue()));
    this.formVenta.valueChanges.subscribe(() => this.valorVenta.set(this.formVenta.getRawValue()));

    this.formVenta.get('producto_id')!.valueChanges.subscribe((id) => {
      this.productoVenta.set(this.productos().find((p) => p.id === id) ?? null);
    });
    this.formAjuste.get('producto_id')!.valueChanges.subscribe((id) => {
      this.productoAjuste.set(this.productos().find((p) => p.id === id) ?? null);
    });

    this.filtroProducto.valueChanges.subscribe(() => this.reiniciar());
    this.filtroTipo.valueChanges.subscribe(() => this.reiniciar());
    this.desde.valueChanges.subscribe(() => this.reiniciar());
    this.hasta.valueChanges.subscribe(() => this.reiniciar());

    this.cargarCombos();
    this.cargar();
  }

  cargarCombos(): void {
    this.productoService.listar({}).subscribe({
      next: (res) => {
        this.productos.set(res.data.items);
        this.refrescarSeleccionados();
      },
    });
    this.proveedorService.listar({}).subscribe({
      next: (res) => this.proveedores.set(res.data.items),
    });
  }

  private refrescarSeleccionados(): void {
    const vId = this.formVenta.get('producto_id')!.value;
    if (vId) this.productoVenta.set(this.productos().find((p) => p.id === vId) ?? null);
    const aId = this.formAjuste.get('producto_id')!.value;
    if (aId) this.productoAjuste.set(this.productos().find((p) => p.id === aId) ?? null);
  }

  abrirForm(modo: ModoForm): void {
    this.errorForm.set(null);
    this.exito.set(null);
    this.modoForm.update((actual) => (actual === modo ? null : modo));
  }

  cerrarForm(): void {
    this.modoForm.set(null);
    this.errorForm.set(null);
    this.exito.set(null);
  }

  // --- Compra ---
  agregarLineaCompra(): void {
    this.itemsCompra.push(this.crearLineaCompra());
  }

  quitarLineaCompra(i: number): void {
    if (this.itemsCompra.length > 1) this.itemsCompra.removeAt(i);
  }

  alCambiarProductoCompra(i: number): void {
    const linea = this.itemsCompra.at(i);
    const producto = this.productos().find((p) => p.id === linea.get('producto_id')!.value);
    if (producto) {
      linea.get('costo_unitario')!.setValue(String(numero(producto.precio_compra)));
    }
  }

  registrarCompra(): void {
    if (this.formCompra.invalid) {
      this.formCompra.markAllAsTouched();
      this.errorForm.set('Revisa las líneas: cada producto debe tener cantidad y costo.');
      return;
    }

    const valores = this.formCompra.getRawValue();
    const items = valores.items
      .filter((it) => it.producto_id)
      .map((it) => ({
        producto_id: it.producto_id,
        cantidad: it.cantidad,
        costo_unitario: it.costo_unitario,
      }));

    if (items.length === 0) {
      this.errorForm.set('Agrega al menos un producto a la compra.');
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
          this.exito.set(res.data.idempotente ? 'La compra ya había sido registrada.' : 'Compra registrada.');
          this.formCompra.reset({ proveedor_id: '', fecha: ahoraLocalInput(), observaciones: '' });
          this.itemsCompra.clear();
          this.itemsCompra.push(this.crearLineaCompra());
          this.cargarCombos();
          this.cargar();
          this.alertas.cargar();
        },
        error: (e) => {
          this.errorForm.set(mensajeError(e, 'No se pudo registrar la compra.'));
          this.guardando.set(false);
        },
      });
  }

  // --- Venta ---
  registrarVenta(): void {
    if (this.formVenta.invalid || numero(this.formVenta.getRawValue().cantidad) <= 0) {
      this.formVenta.markAllAsTouched();
      this.errorForm.set('Selecciona un producto e ingresa una cantidad mayor a 0.');
      return;
    }

    const valores = this.formVenta.getRawValue();
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
          this.exito.set(res.data.idempotente ? 'La venta ya había sido registrada.' : 'Venta registrada.');
          this.formVenta.reset({
            producto_id: '',
            cantidad: '1',
            motivo: 'VENTA',
            fecha: ahoraLocalInput(),
            observaciones: '',
          });
          this.productoVenta.set(null);
          this.cargarCombos();
          this.cargar();
          this.alertas.cargar();
        },
        error: (e) => {
          this.errorForm.set(mensajeError(e, 'No se pudo registrar la venta.'));
          this.guardando.set(false);
        },
      });
  }

  // --- Ajuste ---
  registrarAjuste(): void {
    const valores = this.formAjuste.getRawValue();
    if (this.formAjuste.invalid || numero(valores.existencias_fisicas) < 0) {
      this.formAjuste.markAllAsTouched();
      this.errorForm.set('Selecciona un producto e ingresa las existencias contadas.');
      return;
    }

    if (this.productoAjuste() && this.diferenciaAjuste() === 0) {
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
          this.exito.set(res.data.idempotente ? 'El ajuste ya había sido registrado.' : 'Ajuste registrado.');
          this.formAjuste.reset({
            producto_id: '',
            existencias_fisicas: '0',
            motivo: 'CONTEO_FISICO',
            fecha: ahoraLocalInput(),
            observaciones: '',
          });
          this.productoAjuste.set(null);
          this.cargarCombos();
          this.cargar();
          this.alertas.cargar();
        },
        error: (e) => {
          this.errorForm.set(mensajeError(e, 'No se pudo registrar el ajuste.'));
          this.guardando.set(false);
        },
      });
  }

  // --- Historial ---
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
