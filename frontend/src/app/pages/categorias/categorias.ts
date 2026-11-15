import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Categoria } from '../../models';
import { CategoriaService } from '../../services/categoria.service';
import { ModalComponent } from '../../components/modal/modal';
import { mensajeError } from '../../core/api-error.utils';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Categorías</h1>
          <p class="page-subtitle">Organiza tus productos por categorías.</p>
        </div>
        <button type="button" class="btn-uber" (click)="abrirCrear()">Nueva categoría</button>
      </div>

      <div class="toolbar">
        <input
          type="search"
          class="form-control"
          placeholder="Buscar categoría…"
          [formControl]="buscar"
        />
        <label class="checkbox-inline">
          <input
            type="checkbox"
            [checked]="incluirInactivos()"
            (change)="alternarInactivos($event)"
          />
          Mostrar inactivas
        </label>
      </div>

      @if (error()) {
        <div class="alert alert-danger mb-16">{{ error() }}</div>
      }

      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Estado</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (cargando()) {
              <tr>
                <td colspan="4" class="table-empty"><span class="spinner"></span></td>
              </tr>
            } @else if (categorias().length === 0) {
              <tr>
                <td colspan="4" class="table-empty">No hay categorías para mostrar.</td>
              </tr>
            } @else {
              @for (c of categorias(); track c.id) {
                <tr>
                  <td class="font-bold">{{ c.nombre }}</td>
                  <td class="text-muted">{{ c.descripcion || '—' }}</td>
                  <td>
                    @if (c.activo) {
                      <span class="badge badge-disponible"><span class="badge-dot"></span>Activa</span>
                    } @else {
                      <span class="badge badge-neutral"><span class="badge-dot"></span>Inactiva</span>
                    }
                  </td>
                  <td class="text-right">
                    <div class="actions">
                      <button type="button" class="btn-uber btn-uber-outline btn-sm" (click)="abrirEditar(c)">
                        Editar
                      </button>
                      <button type="button" class="btn-uber btn-uber-outline btn-sm" (click)="alternarEstado(c)">
                        {{ c.activo ? 'Desactivar' : 'Activar' }}
                      </button>
                      <button type="button" class="btn-uber btn-uber-danger btn-sm" (click)="eliminar(c)">
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
      <app-modal [titulo]="editando() ? 'Editar categoría' : 'Nueva categoría'" (cerrar)="cerrarForm()">
        @if (errorForm()) {
          <div class="alert alert-danger mb-16">{{ errorForm() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="guardar()">
          <div class="form-group">
            <label class="form-label" for="nombre">Nombre</label>
            <input id="nombre" type="text" class="form-control" formControlName="nombre" />
            @if (campoInvalido('nombre')) {
              <span class="form-error">Ingresa el nombre de la categoría.</span>
            }
          </div>

          <div class="form-group">
            <label class="form-label" for="descripcion">Descripción (opcional)</label>
            <textarea id="descripcion" class="form-control" rows="3" formControlName="descripcion"></textarea>
          </div>

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
export class CategoriasComponent implements OnInit {
  private fb = inject(FormBuilder);
  private categoriaService = inject(CategoriaService);
  private destroyRef = inject(DestroyRef);

  categorias = signal<Categoria[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);

  incluirInactivos = signal(false);
  buscar = this.fb.nonNullable.control('');

  mostrarForm = signal(false);
  editando = signal<Categoria | null>(null);
  guardando = signal(false);
  errorForm = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    descripcion: [''],
  });

  ngOnInit(): void {
    this.buscar.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargar());

    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.categoriaService
      .listar({ buscar: this.buscar.value || undefined, incluirInactivos: this.incluirInactivos() })
      .subscribe({
        next: (res) => {
          this.categorias.set(res.data.items);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e, 'No se pudieron cargar las categorías.'));
          this.cargando.set(false);
        },
      });
  }

  alternarInactivos(evento: Event): void {
    this.incluirInactivos.set((evento.target as HTMLInputElement).checked);
    this.cargar();
  }

  abrirCrear(): void {
    this.editando.set(null);
    this.errorForm.set(null);
    this.form.reset({ nombre: '', descripcion: '' });
    this.mostrarForm.set(true);
  }

  abrirEditar(categoria: Categoria): void {
    this.editando.set(categoria);
    this.errorForm.set(null);
    this.form.reset({ nombre: categoria.nombre, descripcion: categoria.descripcion ?? '' });
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

    const payload = this.form.getRawValue();
    const actual = this.editando();

    const peticion = actual
      ? this.categoriaService.actualizar(actual.id, payload)
      : this.categoriaService.crear(payload);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarForm();
        this.cargar();
      },
      error: (e) => {
        this.errorForm.set(mensajeError(e, 'No se pudo guardar la categoría.'));
        this.guardando.set(false);
      },
    });
  }

  alternarEstado(categoria: Categoria): void {
    this.categoriaService.cambiarEstado(categoria.id, !categoria.activo).subscribe({
      next: () => this.cargar(),
      error: (e) => this.error.set(mensajeError(e, 'No se pudo cambiar el estado.')),
    });
  }

  eliminar(categoria: Categoria): void {
    if (!confirm(`¿Eliminar la categoría "${categoria.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    this.categoriaService.eliminar(categoria.id).subscribe({
      next: () => this.cargar(),
      error: (e) => this.error.set(mensajeError(e, 'No se pudo eliminar la categoría.')),
    });
  }
}
