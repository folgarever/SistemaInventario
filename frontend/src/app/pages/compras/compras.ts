import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReporteService } from '../../services/reporte.service';
import { ProveedorService } from '../../services/proveedor.service';
import { CompraService } from '../../services/compra.service';
import { ToastService } from '../../core/toast.service';
import { mensajeError } from '../../core/api-error.utils';
import { formatoCantidad, formatoMoneda, numero } from '../../core/formato.utils';
import { DocumentoPdf, fechaArchivo, generarPdf } from '../../core/pdf.utils';
import { ModalComponent } from '../../components/modal/modal';
import { construirListaReposicion } from '../../core/reposicion.utils';
import {
  GrupoCompra,
  ItemCompra,
  agruparCompras,
  claveManual,
  itemDesdeReposicion,
  itemsVisibles,
  totalesCompra,
} from '../../core/compras.utils';
import { nuevoUuid } from '../../core/uuid.utils';

// Lista de compra: junta los articulos que el usuario necesita comprar con las
// recomendaciones de bajo stock del inventario, se agrupa por proveedor y se
// puede exportar a PDF. Se guarda en el navegador (no toca el inventario).
@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Lista de compra</h1>
          <p class="page-subtitle">
            Arma lo que te falta comprar: agrega artículos a mano y suma las recomendaciones de
            bajo stock del inventario.
          </p>
        </div>
        <div class="actions">
          <button
            type="button"
            class="btn-uber btn-uber-outline"
            [disabled]="cargando()"
            (click)="cargarRecomendaciones()"
          >
            @if (cargando()) {
              <span class="spinner"></span>
            }
            Actualizar
          </button>
          <button
            type="button"
            class="btn-uber btn-uber-outline"
            [disabled]="filtrados().length === 0 || exportando()"
            (click)="exportar()"
          >
            @if (exportando()) {
              <span class="spinner"></span>
            }
            {{ exportando() ? 'Generando…' : 'Exportar PDF' }}
          </button>
          <button type="button" class="btn-uber" (click)="abrirForm()">Agregar artículo</button>
        </div>
      </div>

      <div class="grid grid-cards mb-16">
        <div class="stat-card">
          <span class="stat-label">Artículos</span>
          <div class="stat-value">{{ totales().total }}</div>
        </div>
        <div class="stat-card">
          <span class="stat-label">Por comprar</span>
          <div class="stat-value stat-value-sm">{{ totales().pendientes }}</div>
        </div>
        <div class="stat-card">
          <span class="stat-label">Comprados</span>
          <div class="stat-value stat-value-sm text-muted">{{ totales().comprados }}</div>
        </div>
        <div class="stat-card">
          <span class="stat-label">Costo estimado</span>
          <div class="stat-value stat-value-sm font-mono">
            {{ formatoMoneda(totales().costoEstimado) }}
          </div>
        </div>
      </div>

      @if (error()) {
        <div class="alert alert-danger mb-16">{{ error() }}</div>
      }

      <div class="toolbar">
        <input
          type="search"
          class="form-control"
          placeholder="Buscar por artículo, SKU o proveedor…"
          [value]="buscar()"
          (input)="buscar.set($any($event.target).value)"
        />
        <label class="checkbox-inline">
          <input
            type="checkbox"
            [checked]="soloPendientes()"
            (change)="soloPendientes.set($any($event.target).checked)"
          />
          Solo por comprar
        </label>
        @if (descartados() > 0) {
          <button
            type="button"
            class="btn-uber btn-uber-outline btn-sm"
            (click)="restaurarDescartados()"
          >
            Restaurar descartados ({{ descartados() }})
          </button>
        }
        @if (totales().comprados > 0) {
          <button type="button" class="btn-uber btn-uber-outline btn-sm" (click)="quitarComprados()">
            Quitar comprados
          </button>
        }
      </div>

      @if (cargando() && visibles().length === 0) {
        <div class="card">
          @for (fila of filasSkeleton; track fila) {
            <span class="skeleton skeleton-line" style="width: 100%; margin-bottom: 12px"></span>
          }
        </div>
      } @else if (visibles().length === 0) {
        <div class="card">
          <div class="empty-state">
            <span class="empty-state-icon" aria-hidden="true">✓</span>
            <span class="empty-state-title">Nada por comprar</span>
            <span class="empty-state-text">
              No hay productos con bajo stock ni artículos agregados. Usa “Agregar artículo” para
              sumar lo que necesites.
            </span>
          </div>
        </div>
      } @else if (filtrados().length === 0) {
        <div class="card">
          <div class="empty-state">
            <span class="empty-state-icon" aria-hidden="true">▤</span>
            <span class="empty-state-title">Sin resultados</span>
            <span class="empty-state-text">Ningún artículo coincide con la búsqueda.</span>
          </div>
        </div>
      } @else {
        @for (grupo of grupos(); track grupo.proveedor) {
          <div class="card mb-16">
            <div class="card-header">
              <h2 class="section-title">{{ grupo.proveedor }}</h2>
              <span class="text-muted">{{ resumenGrupo(grupo) }}</span>
            </div>
            <div class="table-wrapper">
              <table class="table">
                <thead>
                  <tr>
                    <th>Comprado</th>
                    <th>Artículo</th>
                    <th>Origen</th>
                    <th class="text-right">Cantidad</th>
                    <th>Unidad</th>
                    <th class="text-right">Costo est.</th>
                    <th class="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of grupo.items; track item.clave) {
                    <tr [class.item-comprado]="item.comprado">
                      <td>
                        <input
                          type="checkbox"
                          [checked]="item.comprado"
                          [attr.aria-label]="'Marcar ' + item.nombre + ' como comprado'"
                          (change)="marcar(item, $event)"
                        />
                      </td>
                      <td>
                        <span class="item-nombre font-bold">{{ item.nombre }}</span>
                        @if (item.sku) {
                          <span class="text-muted font-mono"> · {{ item.sku }}</span>
                        }
                        @if (item.nota) {
                          <span class="item-nota">{{ item.nota }}</span>
                        }
                      </td>
                      <td>
                        @if (item.origen === 'RECOMENDADO') {
                          <span class="badge badge-bajo">Bajo stock</span>
                        } @else {
                          <span class="badge badge-neutral">Manual</span>
                        }
                      </td>
                      <td class="text-right">
                        <input
                          type="number"
                          class="form-control conteo-input"
                          step="0.001"
                          min="0"
                          [value]="item.cantidad"
                          [attr.aria-label]="'Cantidad de ' + item.nombre"
                          (change)="cambiarCantidad(item, $event)"
                        />
                      </td>
                      <td>{{ item.unidad }}</td>
                      <td class="text-right font-mono">{{ costoLinea(item) }}</td>
                      <td class="text-right">
                        <button
                          type="button"
                          class="btn-uber btn-uber-outline btn-sm"
                          (click)="quitar(item)"
                        >
                          {{ item.origen === 'MANUAL' ? 'Quitar' : 'Descartar' }}
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      }
    </div>

    @if (mostrandoForm()) {
      <app-modal titulo="Agregar artículo" (cerrar)="cerrarForm()">
        <form [formGroup]="form" (ngSubmit)="guardarManual()">
          <div class="form-group">
            <label class="form-label" for="c_nombre">Artículo</label>
            <input
              id="c_nombre"
              class="form-control"
              formControlName="nombre"
              placeholder="Ej. Bolsas de empaque"
              autocomplete="off"
            />
            @if (form.controls.nombre.touched && form.controls.nombre.invalid) {
              <span class="form-error">Escribe el nombre del artículo.</span>
            }
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label" for="c_cantidad">Cantidad</label>
              <input
                id="c_cantidad"
                type="number"
                step="0.001"
                min="0"
                class="form-control"
                formControlName="cantidad"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="c_unidad">Unidad</label>
              <input
                id="c_unidad"
                class="form-control"
                formControlName="unidad"
                placeholder="unidad"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="c_proveedor">Proveedor (opcional)</label>
            <input
              id="c_proveedor"
              class="form-control"
              formControlName="proveedor"
              list="lista-proveedores"
              placeholder="Dónde lo vas a comprar"
              autocomplete="off"
            />
            <datalist id="lista-proveedores">
              @for (p of proveedores(); track p) {
                <option [value]="p"></option>
              }
            </datalist>
          </div>

          <div class="form-group">
            <label class="form-label" for="c_nota">Nota (opcional)</label>
            <input
              id="c_nota"
              class="form-control"
              formControlName="nota"
              placeholder="Marca, tamaño, detalle…"
            />
          </div>

          <div class="modal-actions">
            <button type="button" class="btn-uber btn-uber-outline" (click)="cerrarForm()">
              Cancelar
            </button>
            <button type="submit" class="btn-uber">Agregar</button>
          </div>
        </form>
      </app-modal>
    }
  `,
})
export class ComprasComponent implements OnInit {
  private fb = inject(FormBuilder);
  private reporteService = inject(ReporteService);
  private proveedorService = inject(ProveedorService);
  private toast = inject(ToastService);
  readonly compra = inject(CompraService);

  readonly formatoMoneda = formatoMoneda;
  readonly filasSkeleton = [1, 2, 3];

  readonly cargando = signal(true);
  readonly exportando = signal(false);
  readonly error = signal<string | null>(null);
  readonly buscar = signal('');
  readonly soloPendientes = signal(false);
  readonly mostrandoForm = signal(false);
  readonly proveedores = signal<string[]>([]);

  // Lineas que se muestran (sin descartados).
  readonly visibles = computed(() => itemsVisibles(this.compra.items()));
  readonly filtrados = computed(() => {
    const termino = this.buscar().trim().toLowerCase();
    const soloPendientes = this.soloPendientes();
    return this.visibles().filter((item) => {
      if (soloPendientes && item.comprado) return false;
      if (!termino) return true;
      return (
        item.nombre.toLowerCase().includes(termino) ||
        (item.sku ?? '').toLowerCase().includes(termino) ||
        (item.proveedor ?? '').toLowerCase().includes(termino)
      );
    });
  });
  readonly grupos = computed(() => agruparCompras(this.filtrados()));
  readonly totales = computed(() => totalesCompra(this.visibles()));
  readonly descartados = computed(() => this.compra.items().filter((i) => i.descartado).length);

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    cantidad: [1, [Validators.required, Validators.min(0.001)]],
    unidad: ['unidad'],
    proveedor: [''],
    nota: [''],
  });

  ngOnInit(): void {
    this.cargarProveedores();
    this.cargarRecomendaciones();
  }

  cargarProveedores(): void {
    this.proveedorService.listar({ incluirInactivos: true }).subscribe({
      next: (res) => this.proveedores.set(res.data.items.map((p) => p.nombre)),
      // Las sugerencias son opcionales: si fallan, se escribe a mano.
      error: () => undefined,
    });
  }

  // Reinyecta las recomendaciones de bajo stock conservando lo que ya hizo el usuario.
  cargarRecomendaciones(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.reporteService.inventario({ soloBajoStock: true }).subscribe({
      next: (res) => {
        const recomendados = construirListaReposicion(res.data.items).items.map(itemDesdeReposicion);
        this.compra.sincronizarRecomendados(recomendados);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e, 'No se pudieron cargar las recomendaciones.'));
        this.cargando.set(false);
      },
    });
  }

  marcar(item: ItemCompra, evento: Event): void {
    this.compra.actualizar(item.clave, {
      comprado: (evento.target as HTMLInputElement).checked,
    });
  }

  cambiarCantidad(item: ItemCompra, evento: Event): void {
    const bruto = (evento.target as HTMLInputElement).value;
    if (bruto === '') return;
    this.compra.actualizar(item.clave, { cantidad: Math.max(numero(bruto), 0), editado: true });
  }

  // Los manuales se borran; los recomendados se descartan (vuelven si siguen bajos).
  quitar(item: ItemCompra): void {
    if (item.origen === 'MANUAL') {
      this.compra.eliminar(item.clave);
    } else {
      this.compra.actualizar(item.clave, { descartado: true });
    }
  }

  restaurarDescartados(): void {
    this.compra.restaurarDescartados();
  }

  quitarComprados(): void {
    const cantidad = this.totales().comprados;
    this.compra.quitarComprados();
    this.toast.info(
      cantidad === 1 ? 'Se quitó 1 artículo comprado.' : `Se quitaron ${cantidad} artículos comprados.`,
    );
  }

  costoLinea(item: ItemCompra): string {
    return item.precioCompra > 0 ? formatoMoneda(item.cantidad * item.precioCompra) : '—';
  }

  resumenGrupo(grupo: GrupoCompra): string {
    const pendientes = grupo.items.filter((i) => !i.comprado).length;
    if (pendientes === 0) return 'Todo comprado';
    return pendientes === 1 ? '1 por comprar' : `${pendientes} por comprar`;
  }

  abrirForm(): void {
    this.form.reset({ nombre: '', cantidad: 1, unidad: 'unidad', proveedor: '', nota: '' });
    this.mostrandoForm.set(true);
  }

  cerrarForm(): void {
    this.mostrandoForm.set(false);
  }

  guardarManual(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const cantidad = numero(v.cantidad);
    if (cantidad <= 0) {
      this.form.controls.cantidad.setErrors({ min: true });
      this.form.controls.cantidad.markAsTouched();
      return;
    }

    const item: ItemCompra = {
      clave: claveManual(nuevoUuid()),
      nombre: v.nombre.trim(),
      sku: null,
      unidad: v.unidad.trim() || 'unidad',
      cantidad,
      proveedor: v.proveedor.trim() || null,
      nota: v.nota.trim() || null,
      origen: 'MANUAL',
      precioCompra: 0,
      comprado: false,
      editado: false,
      descartado: false,
    };

    this.compra.agregar(item);
    this.toast.exito('Artículo agregado a la lista.');
    this.cerrarForm();
  }

  async exportar(): Promise<void> {
    const items = this.filtrados();
    if (items.length === 0) return;

    this.exportando.set(true);
    this.error.set(null);
    try {
      const grupos = agruparCompras(items);
      const totales = totalesCompra(items);
      const documento: DocumentoPdf = {
        titulo: 'Lista de compra',
        subtitulo: 'Artículos a comprar, agrupados por proveedor',
        meta: [
          `Artículos: ${totales.total} · Por comprar: ${totales.pendientes} · Comprados: ${totales.comprados}`,
        ],
        resumen: [
          { etiqueta: 'Artículos', valor: String(totales.total) },
          { etiqueta: 'Por comprar', valor: String(totales.pendientes) },
          { etiqueta: 'Unidades', valor: formatoCantidad(totales.unidadesPendientes) },
          { etiqueta: 'Costo estimado', valor: formatoMoneda(totales.costoEstimado) },
        ],
        secciones: grupos.map((grupo) => ({
          titulo: grupo.proveedor,
          columnas: [
            { encabezado: 'Artículo', clave: 'nombre' },
            { encabezado: 'SKU', clave: 'sku' },
            { encabezado: 'Cantidad', clave: 'cantidad', alineacion: 'right' as const },
            { encabezado: 'Unidad', clave: 'unidad' },
            { encabezado: 'Origen', clave: 'origen' },
            { encabezado: 'Costo estimado', clave: 'costo', alineacion: 'right' as const },
            { encabezado: 'Estado', clave: 'estado' },
          ],
          filas: grupo.items.map((item) => this.filaPdf(item)),
        })),
        nombreArchivo: `lista-compra-${fechaArchivo()}.pdf`,
        horizontal: true,
      };

      await generarPdf(documento);
    } catch {
      this.error.set('No se pudo generar el PDF.');
    } finally {
      this.exportando.set(false);
    }
  }

  private filaPdf(item: ItemCompra): Record<string, string> {
    return {
      nombre: item.nombre,
      sku: item.sku ?? '—',
      cantidad: formatoCantidad(item.cantidad),
      unidad: item.unidad,
      origen: item.origen === 'RECOMENDADO' ? 'Bajo stock' : 'Manual',
      costo: item.precioCompra > 0 ? formatoMoneda(item.cantidad * item.precioCompra) : '—',
      estado: item.comprado ? 'Comprado' : 'Pendiente',
    };
  }
}
