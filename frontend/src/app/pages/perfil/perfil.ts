import { Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { mensajeError } from '../../core/api-error.utils';
import { ToastService } from '../../core/toast.service';

function passwordsIguales(control: AbstractControl): { [key: string]: boolean } | null {
  const nueva = control.get('passwordNueva')?.value;
  const confirmar = control.get('confirmar')?.value;
  return nueva && confirmar && nueva !== confirmar ? { noCoinciden: true } : null;
}

// Pagina de perfil: permite actualizar nombres/apellidos y cambiar la contraseña.
@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Mi perfil</h1>
          <p class="page-subtitle">Administra tus datos personales y tu contraseña.</p>
        </div>
      </div>

      <div class="perfil-grid">
        <div class="card">
          <div class="card-header">
            <h2 class="section-title">Datos personales</h2>
          </div>

          @if (mensajePerfil()) {
            <div class="alert alert-danger mb-16">
              {{ mensajePerfil() }}
            </div>
          }

          <form [formGroup]="formPerfil" (ngSubmit)="guardarPerfil()">
            <div class="form-group">
              <label class="form-label" for="nombres">Nombres</label>
              <input id="nombres" type="text" class="form-control" formControlName="nombres" />
              @if (invalido(formPerfil, 'nombres')) {
                <span class="form-error">Ingresa tus nombres.</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="apellidos">Apellidos</label>
              <input id="apellidos" type="text" class="form-control" formControlName="apellidos" />
              @if (invalido(formPerfil, 'apellidos')) {
                <span class="form-error">Ingresa tus apellidos.</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="email">Correo electrónico</label>
              <input id="email" type="email" class="form-control" [value]="usuario()?.email ?? ''" disabled />
              <span class="form-hint">El correo y el usuario no se pueden modificar.</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="username">Nombre de usuario</label>
              <input id="username" type="text" class="form-control" [value]="usuario()?.username ?? ''" disabled />
            </div>

            <button type="submit" class="btn-uber" [disabled]="guardandoPerfil()">
              @if (guardandoPerfil()) {
                <span class="spinner"></span>
              }
              {{ guardandoPerfil() ? 'Guardando…' : 'Guardar cambios' }}
            </button>
          </form>
        </div>

        <div class="card">
          <div class="card-header">
            <h2 class="section-title">Cambiar contraseña</h2>
          </div>

          @if (mensajePassword()) {
            <div class="alert alert-danger mb-16">
              {{ mensajePassword() }}
            </div>
          }

          <form [formGroup]="formPassword" (ngSubmit)="cambiarPassword()">
            <div class="form-group">
              <label class="form-label" for="passwordActual">Contraseña actual</label>
              <input
                id="passwordActual"
                type="password"
                class="form-control"
                formControlName="passwordActual"
                autocomplete="current-password"
              />
              @if (invalido(formPassword, 'passwordActual')) {
                <span class="form-error">Ingresa tu contraseña actual.</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="passwordNueva">Nueva contraseña</label>
              <input
                id="passwordNueva"
                type="password"
                class="form-control"
                formControlName="passwordNueva"
                autocomplete="new-password"
              />
              <span class="form-hint">Mínimo 8 caracteres, con al menos una letra y un número.</span>
              @if (invalido(formPassword, 'passwordNueva')) {
                <span class="form-error">La contraseña no cumple los requisitos.</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="confirmar">Confirmar nueva contraseña</label>
              <input
                id="confirmar"
                type="password"
                class="form-control"
                formControlName="confirmar"
                autocomplete="new-password"
              />
              @if (
                formPassword.errors?.['noCoinciden'] &&
                (formPassword.get('confirmar')?.touched || formPassword.get('confirmar')?.dirty)
              ) {
                <span class="form-error">Las contraseñas no coinciden.</span>
              }
            </div>

            <button type="submit" class="btn-uber" [disabled]="guardandoPassword()">
              @if (guardandoPassword()) {
                <span class="spinner"></span>
              }
              {{ guardandoPassword() ? 'Actualizando…' : 'Actualizar contraseña' }}
            </button>
          </form>
        </div>
      </div>

      <div class="card card-danger mt-16">
        <div class="card-header">
          <h2 class="section-title text-danger">Eliminar cuenta</h2>
        </div>
        <p class="text-muted mb-16">
          Esta acción es permanente: se eliminarán tu cuenta y todos tus datos (productos,
          movimientos, proveedores y reportes). No se puede deshacer.
        </p>

        @if (mensajeEliminar()) {
          <div class="alert alert-danger mb-16">{{ mensajeEliminar() }}</div>
        }

        @if (!confirmarEliminar()) {
          <button type="button" class="btn-uber btn-uber-danger" (click)="confirmarEliminar.set(true)">
            Eliminar mi cuenta
          </button>
        } @else {
          <form [formGroup]="formEliminar" (ngSubmit)="eliminarCuenta()">
            <div class="form-group">
              <label class="form-label" for="passwordEliminar">Confirma tu contraseña</label>
              <input
                id="passwordEliminar"
                type="password"
                class="form-control"
                formControlName="password"
                autocomplete="current-password"
              />
              @if (invalido(formEliminar, 'password')) {
                <span class="form-error">Ingresa tu contraseña.</span>
              }
            </div>

            <div class="btn-row">
              <button type="submit" class="btn-uber btn-uber-danger" [disabled]="eliminando()">
                @if (eliminando()) {
                  <span class="spinner"></span>
                }
                {{ eliminando() ? 'Eliminando…' : 'Eliminar definitivamente' }}
              </button>
              <button
                type="button"
                class="btn-uber btn-uber-outline"
                [disabled]="eliminando()"
                (click)="cancelarEliminar()"
              >
                Cancelar
              </button>
            </div>
          </form>
        }
      </div>
    </div>
  `,
})
export class PerfilComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  usuario = this.auth.currentUser;

  guardandoPerfil = signal(false);
  mensajePerfil = signal<string | null>(null);

  guardandoPassword = signal(false);
  mensajePassword = signal<string | null>(null);

  confirmarEliminar = signal(false);
  eliminando = signal(false);
  mensajeEliminar = signal<string | null>(null);

  formPerfil = this.fb.nonNullable.group({
    nombres: [this.auth.currentUser()?.nombres ?? '', [Validators.required, Validators.maxLength(100)]],
    apellidos: [this.auth.currentUser()?.apellidos ?? '', [Validators.required, Validators.maxLength(100)]],
  });

  formPassword = this.fb.nonNullable.group(
    {
      passwordActual: ['', [Validators.required]],
      passwordNueva: [
        '',
        [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)],
      ],
      confirmar: ['', [Validators.required]],
    },
    { validators: passwordsIguales },
  );

  formEliminar = this.fb.nonNullable.group({
    password: ['', [Validators.required]],
  });

  ngOnInit(): void {
    // Refresca los datos del usuario desde el servidor.
    this.auth.refrescarPerfil().subscribe({ error: () => {} });
  }

  invalido(form: AbstractControl, campo: string): boolean {
    const control = form.get(campo);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  guardarPerfil(): void {
    if (this.formPerfil.invalid) {
      this.formPerfil.markAllAsTouched();
      return;
    }

    this.guardandoPerfil.set(true);
    this.mensajePerfil.set(null);

    this.auth.actualizarPerfil(this.formPerfil.getRawValue()).subscribe({
      next: () => {
        this.mensajePerfil.set(null);
        this.guardandoPerfil.set(false);
        this.toast.exito('Datos actualizados correctamente.');
      },
      error: (e) => {
        this.mensajePerfil.set(mensajeError(e, 'No se pudieron guardar los cambios.'));
        this.guardandoPerfil.set(false);
      },
    });
  }

  cambiarPassword(): void {
    if (this.formPassword.invalid) {
      this.formPassword.markAllAsTouched();
      return;
    }

    this.guardandoPassword.set(true);
    this.mensajePassword.set(null);

    const { passwordActual, passwordNueva } = this.formPassword.getRawValue();

    this.auth.cambiarPassword({ passwordActual, passwordNueva }).subscribe({
      next: () => {
        this.mensajePassword.set(null);
        this.guardandoPassword.set(false);
        this.formPassword.reset();
        this.toast.exito('Contraseña actualizada correctamente.');
      },
      error: (e) => {
        this.mensajePassword.set(mensajeError(e, 'No se pudo actualizar la contraseña.'));
        this.guardandoPassword.set(false);
      },
    });
  }

  cancelarEliminar(): void {
    this.confirmarEliminar.set(false);
    this.mensajeEliminar.set(null);
    this.formEliminar.reset();
  }

  eliminarCuenta(): void {
    if (this.formEliminar.invalid) {
      this.formEliminar.markAllAsTouched();
      return;
    }

    this.eliminando.set(true);
    this.mensajeEliminar.set(null);

    this.auth.eliminarCuenta(this.formEliminar.getRawValue().password).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.toast.exito('Tu cuenta fue eliminada. Hasta pronto.');
        // Cierra la sesión y redirige al inicio de sesión.
        this.auth.logout();
      },
      error: (e) => {
        this.eliminando.set(false);
        this.mensajeEliminar.set(mensajeError(e, 'No se pudo eliminar la cuenta.'));
      },
    });
  }
}
