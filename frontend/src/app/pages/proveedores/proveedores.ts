import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Proveedor } from '../../models';
import { ProveedorService } from '../../services/proveedor.service';
import { ModalComponent } from '../../components/modal/modal';
import { mensajeError } from '../../core/api-error.utils';

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Proveedores</h1>
          <p class="page-subtitle">Registra las empresas o personas que te suministran productos.</p>
        </div>
        <button type="button" class="btn-uber" (click)="abrirCrear()">Nuevo proveedor</button>
      </div>

      <div class="toolbar">
        <input
          type="search"
          class="form-control"
          placeholder="Buscar proveedor…"
          [formControl]="buscar"
        />
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
              <th>Nombre</th>
              <th>Contacto</th>
              <th>Teléfono</th>
              <th>Correo</th>
              <th>Estado</th>
              <th class="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            @if (cargando()) {
              <tr>
                <td colspan="6" class="table-empty"><span class="spinner"></span></td>
              </tr>
            } @else if (proveedores().length === 0) {
              <tr>
                <td colspan="6" class="table-empty">No hay proveedores para mostrar.</td>
              </tr>
            } @else {
              @for (p of proveedores(); track p.id) {
                <tr>
                  <td class="font-bold">{{ p.nombre }}</td>
                  <td class="text-muted">{{ p.contacto || '—' }}</td>
                  <td class="text-muted">{{ p.telefono || '—' }}</td>
                  <td class="text-muted">{{ p.email || '—' }}</td>
                  <td>
                    @if (p.activo) {
                      <span class="badge badge-disponible"><span class="badge-dot"></span>Activo</span>
                    } @else {
                      <span class="badge badge-neutral"><span class="badge-dot"></span>Inactivo</span>
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
      <app-modal [titulo]="editando() ? 'Editar proveedor' : 'Nuevo proveedor'" (cerrar)="cerrarForm()">
        @if (errorForm()) {
          <div class="alert alert-danger mb-16">{{ errorForm() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="guardar()">
          <div class="form-group">
            <label class="form-label" for="nombre">Nombre / Razón social</label>
            <input id="nombre" type="text" class="form-control" formControlName="nombre" />
            @if (campoInvalido('nombre')) {
              <span class="form-error">Ingresa el nombre del proveedor.</span>
            }
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label" for="contacto">Persona de contacto</label>
              <input id="contacto" type="text" class="form-control" formControlName="contacto" />
            </div>
            <div class="form-group">
              <label class="form-label" for="telefono">Teléfono</label>
              <input id="telefono" type="text" class="form-control" formControlName="telefono" />
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label" for="email">Correo</label>
              <input id="email" type="email" class="form-control" formControlName="email" />
              @if (campoInvalido('email')) {
                <span class="form-error">Ingresa un correo válido.</span>
              }
            </div>
            <div class="form-group">
              <label class="form-label" for="nit">NIT / Documento</label>
              <input id="nit" type="text" class="form-control" formControlName="nit" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="direccion">Dirección</label>
            <input id="direccion" type="text" class="form-control" formControlName="direccion" />
          </div>

          <div class="form-group">
            <label class="form-label" for="observaciones">Observaciones</label>
            <textarea id="observaciones" class="form-control" rows="2" formControlName="observaciones"></textarea>
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
export class ProveedoresComponent implements OnInit {
  private fb = inject(FormBuilder);
  private proveedorService = inject(ProveedorService);
  private destroyRef = inject(DestroyRef);

  proveedores = signal<Proveedor[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);

  incluirInactivos = signal(false);
  buscar = this.fb.nonNullable.control('');

  mostrarForm = signal(false);
  editando = signal<Proveedor | null>(null);
  guardando = signal(false);
  errorForm = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    contacto: [''],
    telefono: [''],
    email: ['', [Validators.email]],
    nit: [''],
    direccion: [''],
    observaciones: [''],
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

    this.proveedorService
      .listar({ buscar: this.buscar.value || undefined, incluirInactivos: this.incluirInactivos() })
      .subscribe({
        next: (res) => {
          this.proveedores.set(res.data.items);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e, 'No se pudieron cargar los proveedores.'));
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
    this.form.reset({
      nombre: '',
      contacto: '',
      telefono: '',
      email: '',
      nit: '',
      direccion: '',
      observaciones: '',
    });
    this.mostrarForm.set(true);
  }

  abrirEditar(proveedor: Proveedor): void {
    this.editando.set(proveedor);
    this.errorForm.set(null);
    this.form.reset({
      nombre: proveedor.nombre,
      contacto: proveedor.contacto ?? '',
      telefono: proveedor.telefono ?? '',
      email: proveedor.email ?? '',
      nit: proveedor.nit ?? '',
      direccion: proveedor.direccion ?? '',
      observaciones: proveedor.observaciones ?? '',
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
    // Se envian cadenas vacias como null para no guardar texto en blanco.
    const payload = {
      nombre: valores.nombre,
      contacto: valores.contacto || null,
      telefono: valores.telefono || null,
      email: valores.email || null,
      nit: valores.nit || null,
      direccion: valores.direccion || null,
      observaciones: valores.observaciones || null,
    };

    const actual = this.editando();
    const peticion = actual
      ? this.proveedorService.actualizar(actual.id, payload)
      : this.proveedorService.crear(payload);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarForm();
        this.cargar();
      },
      error: (e) => {
        this.errorForm.set(mensajeError(e, 'No se pudo guardar el proveedor.'));
        this.guardando.set(false);
      },
    });
  }

  alternarEstado(proveedor: Proveedor): void {
    this.proveedorService.cambiarEstado(proveedor.id, !proveedor.activo).subscribe({
      next: () => this.cargar(),
      error: (e) => this.error.set(mensajeError(e, 'No se pudo cambiar el estado.')),
    });
  }

  eliminar(proveedor: Proveedor): void {
    if (!confirm(`¿Eliminar el proveedor "${proveedor.nombre}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    this.proveedorService.eliminar(proveedor.id).subscribe({
      next: () => this.cargar(),
      error: (e) => this.error.set(mensajeError(e, 'No se pudo eliminar el proveedor.')),
    });
  }
}
