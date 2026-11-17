import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { mensajeError } from '../../core/api-error.utils';

function passwordsIguales(control: AbstractControl): { [key: string]: boolean } | null {
  const password = control.get('passwordNueva')?.value;
  const confirmar = control.get('confirmar')?.value;
  return password && confirmar && password !== confirmar ? { noCoinciden: true } : null;
}

@Component({
  selector: 'app-restablecer',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-shell">
      <div class="auth-card">
        <div class="auth-brand brand-logo" aria-hidden="true"></div>
        <h1 class="auth-title">Restablecer contraseña</h1>
        <p class="auth-subtitle">Define una nueva contraseña para tu cuenta.</p>

        @if (!token()) {
          <div class="alert alert-danger mb-16">
            El enlace no es válido. Solicita uno nuevo.
          </div>
        }

        @if (listo()) {
          <div class="alert alert-success mb-16">
            Contraseña restablecida. Ya puedes iniciar sesión.
          </div>
        }

        @if (error()) {
          <div class="alert alert-danger mb-16">{{ error() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="enviar()">
          <div class="form-group">
            <label class="form-label" for="passwordNueva">Nueva contraseña</label>
            <input id="passwordNueva" type="password" class="form-control" formControlName="passwordNueva" autocomplete="new-password" />
            <span class="form-hint">Mínimo 8 caracteres, con al menos una letra y un número.</span>
            @if (invalido('passwordNueva')) {
              <span class="form-error">La contraseña no cumple los requisitos.</span>
            }
          </div>

          <div class="form-group">
            <label class="form-label" for="confirmar">Confirmar contraseña</label>
            <input id="confirmar" type="password" class="form-control" formControlName="confirmar" autocomplete="new-password" />
            @if (form.errors?.['noCoinciden'] && (form.get('confirmar')?.touched || form.get('confirmar')?.dirty)) {
              <span class="form-error">Las contraseñas no coinciden.</span>
            }
          </div>

          <div class="auth-actions">
            <button type="submit" class="btn-uber" [disabled]="cargando() || !token() || listo()">
              @if (cargando()) {
                <span class="spinner"></span>
              }
              {{ cargando() ? 'Guardando…' : 'Restablecer contraseña' }}
            </button>
          </div>
        </form>

        <div class="auth-links">
          <a routerLink="/login">Ir a iniciar sesión</a>
        </div>
      </div>
    </div>
  `,
})
export class RestablecerComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  cargando = signal(false);
  listo = signal(false);
  error = signal<string | null>(null);
  token = signal<string>(this.route.snapshot.queryParamMap.get('token') ?? '');

  form = this.fb.nonNullable.group(
    {
      passwordNueva: [
        '',
        [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)],
      ],
      confirmar: ['', [Validators.required]],
    },
    { validators: passwordsIguales },
  );

  invalido(campo: string): boolean {
    const control = this.form.get(campo);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  enviar(): void {
    if (!this.token() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.error.set(null);

    this.auth.restablecerPassword(this.token(), this.form.getRawValue().passwordNueva).subscribe({
      next: () => {
        this.listo.set(true);
        this.cargando.set(false);
        setTimeout(() => this.router.navigate(['/login']), 2500);
      },
      error: (e) => {
        this.error.set(mensajeError(e, 'No se pudo restablecer la contraseña.'));
        this.cargando.set(false);
      },
    });
  }
}
