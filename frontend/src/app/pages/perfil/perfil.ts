import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { mensajeError } from '../../core/api-error.utils';

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
            <div
              class="alert mb-16"
              [class.alert-success]="perfilOk()"
              [class.alert-danger]="!perfilOk()"
            >
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
            <div
              class="alert mb-16"
              [class.alert-success]="passwordOk()"
              [class.alert-danger]="!passwordOk()"
            >
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
    </div>
  `,
})
export class PerfilComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  usuario = this.auth.currentUser;

  guardandoPerfil = signal(false);
  mensajePerfil = signal<string | null>(null);
  perfilOk = signal(false);

  guardandoPassword = signal(false);
  mensajePassword = signal<string | null>(null);
  passwordOk = signal(false);

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
        this.perfilOk.set(true);
        this.mensajePerfil.set('Datos actualizados correctamente.');
        this.guardandoPerfil.set(false);
      },
      error: (e) => {
        this.perfilOk.set(false);
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
        this.passwordOk.set(true);
        this.mensajePassword.set('Contraseña actualizada correctamente.');
        this.guardandoPassword.set(false);
        this.formPassword.reset();
      },
      error: (e) => {
        this.passwordOk.set(false);
        this.mensajePassword.set(mensajeError(e, 'No se pudo actualizar la contraseña.'));
        this.guardandoPassword.set(false);
      },
    });
  }
}
