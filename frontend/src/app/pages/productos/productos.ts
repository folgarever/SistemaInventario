import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Categoria, Producto, Proveedor } from '../../models';
import { ProductoService } from '../../services/producto.service';
import { CategoriaService } from '../../services/categoria.service';
import { ProveedorService } from '../../services/proveedor.service';
import { ModalComponent } from '../../components/modal/modal';
import { mensajeError } from '../../core/api-error.utils';
import { estadoStock, formatoCantidad, formatoMoneda } from '../../core/formato.utils';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Productos</h1>
          <p class="page-subtitle">Catálogo de productos, precios y existencias.</p>
        </div>
        <button type="button" class="btn-uber" (click)="abrirCrear()">Nuevo producto</button>
      </div>

      <div class="toolbar">
        <input
          type="search"
          class="form-control"
          placeholder="Buscar por nombre o SKU…"
          [formControl]="buscar"
        />
        <select class="form-select form-control" [formControl]="filtroCategoria">
          <option value="">Todas las categorías</option>
          @for (c of categorias(); track c.id) {
            <option [value]="c.id">{{ c.nombre }}</option>
          }
        </select>
        <label class="checkbox-inline">
          <input type="checkbox" [checked]="soloBajoStock()" (change)="alternarBajoStock($event)" />
          Solo bajo stock
        </label>
        <label class="checkbox-inline">
          <input
            type="checkbox"
            [checked]="incluirInactivos()"
            (change)="alternarInactivos($event)"
          />
          Mostrar inactivos
        </label>
      </div>

      @if (error()) {
        <div class="alert alert-danger mb-16">{{ error() }}</div>
      }

      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Producto</th>
              <th>Categoría</th>
              <th class="text-right">Precio venta</th>
              <th class="text-right">Existencias</th>
              <th>Estado</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (cargando()) {
              <tr>
                <td colspan="7" class="table-empty"><span class="spinner"></span></td>
              </tr>
            } @else if (productos().length === 0) {
              <tr>
                <td colspan="7" class="table-empty">No hay productos para mostrar.</td>
              </tr>
            } @else {
              @for (p of productos(); track p.id) {
                <tr>
                  <td class="font-mono text-muted">{{ p.sku }}</td>
                  <td>
                    <span class="font-bold">{{ p.nombre }}</span>
                    @if (!p.activo) {
                      <span class="badge badge-neutral" style="margin-left: 8px;">Inactivo</span>
                    }
                  </td>
                  <td class="text-muted">{{ p.categoria?.nombre || '—' }}</td>
                  <td class="text-right font-mono">{{ formatoMoneda(p.precio_venta) }}</td>
                  <td class="text-right font-mono">
                    {{ formatoCantidad(p.stock) }} {{ p.unidad_medida }}
                  </td>
                  <td>
                    @switch (estado(p)) {
                      @case ('agotado') {
                        <span class="badge badge-agotado"><span class="badge-dot"></span>Agotado</span>
                      }
                      @case ('bajo') {
                        <span class="badge badge-bajo"><span class="badge-dot"></span>Bajo stock</span>
                      }
                      @default {
                        <span class="badge badge-disponible"><span class="badge-dot"></span>Disponible</span>
                      }
                    }
                  </td>
                  <td class="text-right">
                    <div class="actions">
                      <button type="button" class="btn-uber btn-uber-outline btn-sm" (click)="abrirEditar(p)">
                        Editar
                      </button>
                      <button type="button" class="btn-uber btn-uber-outline btn-sm" (click)="alternarEstado(p)">
                        {{ p.activo ? 'Desactivar' : 'Activar' }}
                      </button>
                      <button type="button" class="btn-uber btn-uber-danger btn-sm" (click)="eliminar(p)">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </div>

    @if (mostrarForm()) {
      <app-modal [titulo]="editando() ? 'Editar producto' : 'Nuevo producto'" (cerrar)="cerrarForm()">
        @if (errorForm()) {
          <div class="alert alert-danger mb-16">{{ errorForm() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="guardar()">
          <div class="form-group">
            <label class="form-label" for="nombre">Nombre</label>
            <input id="nombre" type="text" class="form-control" formControlName="nombre" />
            @if (campoInvalido('nombre')) {
              <span class="form-error">Ingresa el nombre del producto.</span>
            }
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label" for="sku">SKU / Código</label>
              <input id="sku" type="text" class="form-control" formControlName="sku" />
              @if (campoInvalido('sku')) {
                <span class="form-error">Ingresa el SKU del producto.</span>
              }
            </div>
            <div class="form-group">
              <label class="form-label" for="unidad_medida">Unidad de medida</label>
              <input
                id="unidad_medida"
                type="text"
                class="form-control"
                formControlName="unidad_medida"
                list="unidades"
                placeholder="unidad"
              />
              <datalist id="unidades">
                @for (u of unidades; track u) {
                  <option [value]="u"></option>
                }
              </datalist>
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label" for="categoria_id">Categoría</label>
              <select id="categoria_id" class="form-select form-control" formControlName="categoria_id">
                <option value="">Sin categoría</option>
                @for (c of categorias(); track c.id) {
                  <option [value]="c.id">{{ c.nombre }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="proveedor_id">Proveedor</label>
              <select id="proveedor_id" class="form-select form-control" formControlName="proveedor_id">
                <option value="">Sin proveedor</option>
                @for (p of proveedores(); track p.id) {
                  <option [value]="p.id">{{ p.nombre }}</option>
                }
              </select>
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label" for="precio_compra">Precio de compra</label>
              <input
                id="precio_compra"
                type="number"
                step="0.01"
                min="0"
                class="form-control"
                formControlName="precio_compra"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="precio_venta">Precio de venta</label>
              <input
                id="precio_venta"
                type="number"
                step="0.01"
                min="0"
                class="form-control"
                formControlName="precio_venta"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="stock_minimo">Stock mínimo</label>
              <input
                id="stock_minimo"
                type="number"
                step="0.001"
                min="0"
                class="form-control"
                formControlName="stock_minimo"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="descripcion">Descripción (opcional)</label>
            <textarea id="descripcion" class="form-control" rows="2" formControlName="descripcion"></textarea>
          </div>

          @if (editando()) {
            <div class="alert">
              <span>
                Las existencias actuales ({{ formatoCantidad(editando()!.stock) }}
                {{ editando()!.unidad_medida }}) solo cambian con entradas, salidas o ajustes.
              </span>
            </div>
          }

          <div class="modal-actions">
            <button type="button" class="btn-uber btn-uber-outline" (click)="cerrarForm()">Cancelar</button>
            <button type="submit" class="btn-uber" [disabled]="guardando()">
              @if (guardando()) {
                <span class="spinner"></span>
              }
              {{ guardando() ? 'Guardando…' : 'Guardar' }}
            </button>
          </div>
        </form>
      </app-modal>
    }
  `,
})
export class ProductosComponent implements OnInit {
  private fb = inject(FormBuilder);
  private productoService = inject(ProductoService);
  private categoriaService = inject(CategoriaService);
  private proveedorService = inject(ProveedorService);
  private destroyRef = inject(DestroyRef);

  readonly unidades = [
    'unidad',
    'caja',
    'paquete',
    'docena',
    'kg',
    'g',
    'litro',
    'ml',
    'metro',
    'cm',
  ];

  readonly formatoMoneda = formatoMoneda;
  readonly formatoCantidad = formatoCantidad;

  productos = signal<Producto[]>([]);
  categorias = signal<Categoria[]>([]);
  proveedores = signal<Proveedor[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);

  incluirInactivos = signal(false);
  soloBajoStock = signal(false);
  buscar = this.fb.nonNullable.control('');
  filtroCategoria = this.fb.nonNullable.control('');

  mostrarForm = signal(false);
  editando = signal<Producto | null>(null);
  guardando = signal(false);
  errorForm = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    sku: ['', [Validators.required, Validators.maxLength(60)]],
    unidad_medida: ['unidad', [Validators.required, Validators.maxLength(30)]],
    categoria_id: [''],
    proveedor_id: [''],
    precio_compra: ['0'],
    precio_venta: ['0'],
    stock_minimo: ['0'],
    descripcion: [''],
  });

  ngOnInit(): void {
    this.buscar.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargar());

    this.filtroCategoria.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargar());

    this.cargarCombos();
    this.cargar();
  }

  cargarCombos(): void {
    this.categoriaService.listar({ incluirInactivos: true }).subscribe({
      next: (res) => this.categorias.set(res.data.items),
    });
    this.proveedorService.listar({ incluirInactivos: true }).subscribe({
      next: (res) => this.proveedores.set(res.data.items),
    });
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.productoService
      .listar({
        buscar: this.buscar.value || undefined,
        categoriaId: this.filtroCategoria.value || undefined,
        incluirInactivos: this.incluirInactivos(),
        soloBajoStock: this.soloBajoStock(),
      })
      .subscribe({
        next: (res) => {
          this.productos.set(res.data.items);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e, 'No se pudieron cargar los productos.'));
          this.cargando.set(false);
        },
      });
  }

  alternarInactivos(evento: Event): void {
    this.incluirInactivos.set((evento.target as HTMLInputElement).checked);
    this.cargar();
  }

  alternarBajoStock(evento: Event): void {
    this.soloBajoStock.set((evento.target as HTMLInputElement).checked);
    this.cargar();
  }

  estado(p: Producto) {
    return estadoStock(p.stock, p.stock_minimo);
  }

  abrirCrear(): void {
    this.editando.set(null);
    this.errorForm.set(null);
    this.form.reset({
      nombre: '',
      sku: '',
      unidad_medida: 'unidad',
      categoria_id: '',
      proveedor_id: '',
      precio_compra: '0',
      precio_venta: '0',
      stock_minimo: '0',
      descripcion: '',
    });
    this.mostrarForm.set(true);
  }

  abrirEditar(producto: Producto): void {
    this.editando.set(producto);
    this.errorForm.set(null);
    this.form.reset({
      nombre: producto.nombre,
      sku: producto.sku,
      unidad_medida: producto.unidad_medida,
      categoria_id: producto.categoria_id ?? '',
      proveedor_id: producto.proveedor_id ?? '',
      precio_compra: String(producto.precio_compra ?? '0'),
      precio_venta: String(producto.precio_venta ?? '0'),
      stock_minimo: String(producto.stock_minimo ?? '0'),
      descripcion: producto.descripcion ?? '',
    });
    this.mostrarForm.set(true);
  }

  cerrarForm(): void {
    this.mostrarForm.set(false);
    this.editando.set(null);
  }

  campoInvalido(campo: string): boolean {
    const control = this.form.get(campo);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.errorForm.set(null);

    const valores = this.form.getRawValue();
    const payload = {
      nombre: valores.nombre,
      sku: valores.sku,
      unidad_medida: valores.unidad_medida || 'unidad',
      categoria_id: valores.categoria_id || null,
      proveedor_id: valores.proveedor_id || null,
      precio_compra: valores.precio_compra || '0',
      precio_venta: valores.precio_venta || '0',
      stock_minimo: valores.stock_minimo || '0',
      descripcion: valores.descripcion || null,
    };

    const actual = this.editando();
    const peticion = actual
      ? this.productoService.actualizar(actual.id, payload)
      : this.productoService.crear(payload);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarForm();
        this.cargar();
      },
      error: (e) => {
        this.errorForm.set(mensajeError(e, 'No se pudo guardar el producto.'));
        this.guardando.set(false);
      },
    });
  }

  alternarEstado(producto: Producto): void {
    this.productoService.cambiarEstado(producto.id, !producto.activo).subscribe({
      next: () => this.cargar(),
      error: (e) => this.error.set(mensajeError(e, 'No se pudo cambiar el estado.')),
    });
  }

  eliminar(producto: Producto): void {
    if (!confirm(`¿Eliminar el producto "${producto.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    this.productoService.eliminar(producto.id).subscribe({
      next: () => this.cargar(),
      error: (e) => this.error.set(mensajeError(e, 'No se pudo eliminar el producto.')),
    });
  }
}
