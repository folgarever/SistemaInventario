import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { catchError, forkJoin, map, of } from 'rxjs';
import { Producto } from '../../models';
import { ProductoService } from '../../services/producto.service';
import { AjusteService } from '../../services/ajuste.service';
import { ConteoService } from '../../services/conteo.service';
import { ToastService } from '../../core/toast.service';
import { mensajeError } from '../../core/api-error.utils';
import { formatoCantidad, numero } from '../../core/formato.utils';
import { fechaCorta } from '../../core/fecha.utils';
import { nuevoUuid } from '../../core/uuid.utils';
import { DocumentoPdf, fechaArchivo, generarPdf } from '../../core/pdf.utils';
import {
  FRECUENCIAS,
  FrecuenciaConteo,
  diferenciaConteo,
  estadoConteo,
  etiquetaFrecuencia,
  proximoConteo,
  resumenConteo,
} from '../../core/conteo.utils';

interface FilaConteo {
  producto: Producto;
  contado: string;
  diferencia: number;
}

// Conteo fisico guiado: recorre los productos activos, se anota lo que hay
// realmente y se generan los ajustes de las diferencias (motivo CONTEO_FISICO).
// La frecuencia (diario, semanal o quincenal) se configura y se recuerda.
@Component({
  selector: 'app-conteo',
  standalone: true,
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Conteo físico</h1>
          <p class="page-subtitle">
            Recorre tus productos, anota lo que hay realmente y genera los ajustes de las diferencias.
          </p>
        </div>
        <div class="actions">
          <button
            type="button"
            class="btn-uber btn-uber-outline"
            [disabled]="filas().length === 0 || exportando()"
            (click)="exportar()"
          >
            @if (exportando()) {
              <span class="spinner"></span>
            }
            {{ exportando() ? 'Generando…' : 'Exportar PDF' }}
          </button>
          <button
            type="button"
            class="btn-uber btn-uber-outline"
            [disabled]="!hayConteo() || guardando()"
            (click)="limpiar()"
          >
            Limpiar
          </button>
          <button
            type="button"
            class="btn-uber"
            [disabled]="!hayDiferencias() || guardando()"
            (click)="registrar()"
          >
            @if (guardando()) {
              <span class="spinner"></span>
            }
            {{ guardando() ? 'Registrando…' : 'Registrar conteo' }}
          </button>
        </div>
      </div>

      <!-- Frecuencia y recordatorio -->
      <div class="card mb-16">
        <div class="card-header">
          <h2 class="section-title">Frecuencia de conteo</h2>
          <span class="badge badge-ajuste">
            <span class="badge-dot"></span>{{ frecuenciaTexto() }}
          </span>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label class="form-label" for="c_frecuencia">¿Cada cuánto cuentas el inventario?</label>
            <select
              id="c_frecuencia"
              class="form-select form-control"
              [value]="conteo.frecuencia()"
              (change)="cambiarFrecuencia($any($event.target).value)"
            >
              @for (f of frecuencias; track f.valor) {
                <option [value]="f.valor">{{ f.etiqueta }}</option>
              }
            </select>
            <span class="form-hint">Se usa solo para recordarte cuándo toca el próximo conteo.</span>
          </div>
        </div>

        @if (estado(); as e) {
          @if (!e.tieneBase) {
            <p class="text-muted mb-0">
              Aún no registras ningún conteo. Cuando registres el primero, aquí verás cuándo toca
              el siguiente.
            </p>
          } @else if (e.vencido) {
            <div class="alert alert-danger mb-0">
              <span>
                Toca conteo {{ frecuenciaTexto().toLowerCase() }}: debía hacerse el
                <strong>{{ proximaFecha() }}</strong>
                (hace {{ -e.diasRestantes }} día{{ -e.diasRestantes === 1 ? '' : 's' }}).
              </span>
            </div>
          } @else {
            <p class="text-muted mb-0">
              Último conteo: <strong>{{ ultimaFecha() }}</strong> · Próximo:
              <strong>{{ proximaFecha() }}</strong>
              @if (e.diasRestantes === 0) {
                (hoy)
              } @else {
                (en {{ e.diasRestantes }} día{{ e.diasRestantes === 1 ? '' : 's' }})
              }
            </p>
          }
        }
      </div>

      @if (error()) {
        <div class="alert alert-danger mb-16">{{ error() }}</div>
      }

      <div class="toolbar">
        <input
          type="search"
          class="form-control"
          placeholder="Buscar por nombre o SKU…"
          [value]="buscar()"
          (input)="buscar.set($any($event.target).value)"
        />
        <span class="badge badge-neutral">Contados {{ resumen().contados }} de {{ filas().length }}</span>
        @if (resumen().sobrantes > 0) {
          <span class="badge badge-disponible">{{ resumen().sobrantes }} con sobrante</span>
        }
        @if (resumen().faltantes > 0) {
          <span class="badge badge-agotado">{{ resumen().faltantes }} con faltante</span>
        }
      </div>

      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Producto</th>
              <th class="text-right">Sistema</th>
              <th class="text-right">Contado</th>
              <th class="text-right">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            @if (cargando()) {
              @for (fila of filasSkeleton; track fila) {
                <tr class="skeleton-row" aria-hidden="true">
                  <td><span class="skeleton skeleton-line" style="width: 70%"></span></td>
                  <td><span class="skeleton skeleton-line" style="width: 90%"></span></td>
                  <td><span class="skeleton skeleton-line" style="width: 50%"></span></td>
                  <td><span class="skeleton skeleton-line" style="width: 60%"></span></td>
                  <td><span class="skeleton skeleton-line" style="width: 40%"></span></td>
                </tr>
              }
            } @else if (filas().length === 0) {
              <tr>
                <td colspan="5">
                  <div class="empty-state">
                    <span class="empty-state-icon" aria-hidden="true">▤</span>
                    <span class="empty-state-title">
                      {{ productos().length === 0 ? 'Sin productos' : 'Sin resultados' }}
                    </span>
                    <span class="empty-state-text">
                      @if (productos().length === 0) {
                        Agrega productos a tu inventario para poder contarlos.
                      } @else {
                        No hay productos que coincidan con la búsqueda.
                      }
                    </span>
                  </div>
                </td>
              </tr>
            } @else {
              @for (fila of filas(); track fila.producto.id) {
                <tr [class.fila-diferencia]="fila.contado !== '' && fila.diferencia !== 0">
                  <td class="font-mono">{{ fila.producto.sku }}</td>
                  <td>
                    {{ fila.producto.nombre }}
                    <span class="text-muted">· {{ fila.producto.unidad_medida }}</span>
                  </td>
                  <td class="text-right font-mono">{{ formatoCantidad(fila.producto.stock) }}</td>
                  <td class="text-right">
                    <input
                      type="number"
                      class="form-control conteo-input"
                      step="0.001"
                      min="0"
                      placeholder="—"
                      [value]="fila.contado"
                      [attr.aria-label]="'Cantidad contada de ' + fila.producto.nombre"
                      (input)="contar(fila.producto.id, $any($event.target).value)"
                    />
                  </td>
                  <td class="text-right">
                    @if (fila.contado === '') {
                      <span class="text-muted">—</span>
                    } @else if (fila.diferencia === 0) {
                      <span class="badge badge-disponible">Coincide</span>
                    } @else if (fila.diferencia > 0) {
                      <span class="badge badge-disponible">+{{ formatoCantidad(fila.diferencia) }}</span>
                    } @else {
                      <span class="badge badge-agotado">{{ formatoCantidad(fila.diferencia) }}</span>
                    }
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class ConteoComponent implements OnInit {
  private productoService = inject(ProductoService);
  private ajusteService = inject(AjusteService);
  private toast = inject(ToastService);
  readonly conteo = inject(ConteoService);

  readonly frecuencias = FRECUENCIAS;
  readonly filasSkeleton = [1, 2, 3, 4, 5];
  readonly formatoCantidad = formatoCantidad;

  readonly productos = signal<Producto[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly exportando = signal(false);
  readonly error = signal<string | null>(null);
  readonly buscar = signal('');
  // Cantidad contada por producto (clave = id del producto). Vacio = sin contar.
  private readonly contados = signal<Record<string, string>>({});
  // Identificador de idempotencia por producto. Se reutiliza mientras no cambie
  // la cantidad contada, para que reintentar no duplique el ajuste.
  private readonly solicitudes = signal<Record<string, string>>({});

  readonly filas = computed<FilaConteo[]>(() => {
    const termino = this.buscar().trim().toLowerCase();
    const contados = this.contados();
    return this.productos()
      .filter(
        (p) =>
          !termino ||
          p.nombre.toLowerCase().includes(termino) ||
          p.sku.toLowerCase().includes(termino),
      )
      .map((producto) => {
        const contado = contados[producto.id] ?? '';
        return {
          producto,
          contado,
          diferencia: contado === '' ? 0 : diferenciaConteo(contado, producto.stock),
        };
      });
  });

  readonly resumen = computed(() =>
    resumenConteo(this.filas().map((f) => ({ contado: f.contado, sistema: f.producto.stock }))),
  );
  readonly hayConteo = computed(() => this.resumen().contados > 0);
  readonly hayDiferencias = computed(() => this.resumen().diferencias > 0);

  readonly frecuenciaTexto = computed(() => etiquetaFrecuencia(this.conteo.frecuencia()));
  readonly estado = computed(() =>
    estadoConteo(this.conteo.ultimoConteo(), this.conteo.frecuencia()),
  );
  readonly ultimaFecha = computed(() => fechaCorta(this.conteo.ultimoConteo()));
  readonly proximaFecha = computed(() => {
    const proximo = proximoConteo(this.conteo.ultimoConteo(), this.conteo.frecuencia());
    return proximo ? fechaCorta(proximo.toISOString()) : '-';
  });

  ngOnInit(): void {
    this.cargar();
    this.conteo.cargarUltimoConteo();
  }

  cargar(): void {
    this.cargando.set(true);
    this.productoService.listar().subscribe({
      next: (res) => {
        this.productos.set(res.data.items ?? []);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e, 'No se pudieron cargar los productos.'));
        this.cargando.set(false);
      },
    });
  }

  contar(id: string, valor: string): void {
    this.contados.update((actual) => ({ ...actual, [id]: valor }));
    // Si cambia la cantidad, la solicitud anterior ya no representa este conteo.
    this.solicitudes.update((actual) => {
      if (!(id in actual)) return actual;
      const copia = { ...actual };
      delete copia[id];
      return copia;
    });
  }

  limpiar(): void {
    this.contados.set({});
    this.solicitudes.set({});
    this.error.set(null);
  }

  // Exporta la hoja de conteo actual (respeta la busqueda) a PDF.
  async exportar(): Promise<void> {
    const filas = this.filas();
    if (filas.length === 0) return;

    this.exportando.set(true);
    this.error.set(null);
    try {
      const resumen = this.resumen();
      const documento: DocumentoPdf = {
        titulo: 'Conteo físico',
        subtitulo: `Frecuencia ${this.frecuenciaTexto().toLowerCase()}`,
        meta: this.metaConteo(),
        resumen: [
          { etiqueta: 'Productos', valor: String(filas.length) },
          { etiqueta: 'Contados', valor: String(resumen.contados) },
          { etiqueta: 'Diferencias', valor: String(resumen.diferencias) },
          { etiqueta: 'Sobrantes', valor: String(resumen.sobrantes) },
          { etiqueta: 'Faltantes', valor: String(resumen.faltantes) },
        ],
        secciones: [
          {
            titulo: 'Detalle del conteo',
            columnas: [
              { encabezado: 'SKU', clave: 'sku' },
              { encabezado: 'Producto', clave: 'nombre' },
              { encabezado: 'Sistema', clave: 'sistema', alineacion: 'right' },
              { encabezado: 'Contado', clave: 'contado', alineacion: 'right' },
              { encabezado: 'Diferencia', clave: 'diferencia', alineacion: 'right' },
            ],
            filas: filas.map((fila) => this.filaPdf(fila)),
          },
        ],
        nombreArchivo: `conteo-fisico-${fechaArchivo()}.pdf`,
      };

      await generarPdf(documento);
    } catch {
      this.error.set('No se pudo generar el PDF.');
    } finally {
      this.exportando.set(false);
    }
  }

  // Metadatos del recordatorio de conteo para el PDF.
  private metaConteo(): string[] {
    const estado = this.estado();
    if (!estado.tieneBase) return ['Aún no se ha registrado ningún conteo.'];
    return [`Último conteo: ${this.ultimaFecha()}`, `Próximo conteo: ${this.proximaFecha()}`];
  }

  // Fila del conteo lista para la tabla del PDF.
  private filaPdf(fila: FilaConteo): Record<string, string> {
    const sinContar = fila.contado === '';
    const signo = fila.diferencia > 0 ? '+' : '';
    return {
      sku: fila.producto.sku,
      nombre: `${fila.producto.nombre} (${fila.producto.unidad_medida})`,
      sistema: formatoCantidad(fila.producto.stock),
      contado: sinContar ? '—' : formatoCantidad(fila.contado),
      diferencia: sinContar ? '—' : `${signo}${formatoCantidad(fila.diferencia)}`,
    };
  }

  // Devuelve (y crea si hace falta) el identificador de idempotencia de un producto.
  private uuidDe(id: string): string {
    const actual = this.solicitudes();
    if (actual[id]) return actual[id];
    const nuevo = nuevoUuid();
    this.solicitudes.set({ ...actual, [id]: nuevo });
    return nuevo;
  }

  cambiarFrecuencia(valor: string): void {
    this.conteo.cambiarFrecuencia(valor as FrecuenciaConteo);
  }

  registrar(): void {
    const lineas = this.filas().filter(
      (f) => f.contado !== '' && f.diferencia !== 0 && numero(f.contado) >= 0,
    );

    if (lineas.length === 0) {
      this.error.set('No hay diferencias que registrar.');
      return;
    }

    this.guardando.set(true);
    this.error.set(null);

    const observaciones = `Conteo ${this.frecuenciaTexto().toLowerCase()}`;
    const peticiones = lineas.map((fila) =>
      this.ajusteService
        .registrar({
          producto_id: fila.producto.id,
          existencias_fisicas: fila.contado,
          motivo: 'CONTEO_FISICO',
          observaciones,
          client_request_id: this.uuidDe(fila.producto.id),
        })
        .pipe(
          map(() => ({ ok: true as const, id: fila.producto.id })),
          catchError((e) =>
            of({
              ok: false as const,
              id: fila.producto.id,
              mensaje: mensajeError(e, 'No se pudo registrar el ajuste.'),
            }),
          ),
        ),
    );

    forkJoin(peticiones).subscribe((resultados) => {
      this.guardando.set(false);

      const exitos = resultados.filter((r): r is { ok: true; id: string } => r.ok);
      const fallidos = resultados.filter(
        (r): r is { ok: false; id: string; mensaje: string } => !r.ok,
      );

      if (fallidos.length === 0) {
        this.toast.exito(
          exitos.length === 1
            ? 'Conteo registrado: 1 ajuste.'
            : `Conteo registrado: ${exitos.length} ajustes.`,
        );
        this.contados.set({});
        this.solicitudes.set({});
        this.cargar();
        this.conteo.cargarUltimoConteo();
        return;
      }

      // Quita del conteo los productos ya ajustados y deja solo los fallidos.
      const ajustados = new Set(exitos.map((r) => r.id));
      this.contados.update((actual) => {
        const copia = { ...actual };
        for (const id of ajustados) delete copia[id];
        return copia;
      });
      this.solicitudes.update((actual) => {
        const copia = { ...actual };
        for (const id of ajustados) delete copia[id];
        return copia;
      });
      if (exitos.length > 0) {
        this.toast.info(`Se registraron ${exitos.length} de ${resultados.length} ajustes.`);
      }
      this.error.set(
        `No se pudieron registrar ${fallidos.length} de ${resultados.length}: ${fallidos[0].mensaje}`,
      );
      this.cargar();
      this.conteo.cargarUltimoConteo();
    });
  }
}
