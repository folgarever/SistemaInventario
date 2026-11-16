import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { mensajeError } from '../../core/api-error.utils';

function passwordsIguales(control: AbstractControl): { [key: string]: boolean } | null {
  const password = control.get('password')?.value;
  const confirmar = control.get('confirmar')?.value;
  return password && confirmar && password !== confirmar ? { noCoinciden: true } : null;
}

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-shell">
      <div class="auth-card auth-card-wide">
        <div class="auth-brand">SI</div>
        <h1 class="auth-title">Crear una cuenta</h1>
        <p class="auth-subtitle">Registra tus datos para comenzar a controlar tu inventario.</p>

        @if (error()) {
          <div class="alert alert-danger mb-16">{{ error() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="enviar()">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label" for="nombres">Nombres</label>
              <input id="nombres" type="text" class="form-control" formControlName="nombres" />
              @if (invalido('nombres')) {
                <span class="form-error">Ingresa tus nombres.</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="apellidos">Apellidos</label>
              <input id="apellidos" type="text" class="form-control" formControlName="apellidos" />
              @if (invalido('apellidos')) {
                <span class="form-error">Ingresa tus apellidos.</span>
              }
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="email">Correo electrónico</label>
            <input id="email" type="email" class="form-control" formControlName="email" autocomplete="email" />
            @if (invalido('email')) {
              <span class="form-error">Ingresa un correo válido.</span>
            }
          </div>

          <div class="form-group">
            <label class="form-label" for="username">Nombre de usuario</label>
            <input id="username" type="text" class="form-control" formControlName="username" autocomplete="username" />
            <span class="form-hint">Solo letras, números, puntos, guiones y guiones bajos (3 a 30 caracteres).</span>
            @if (invalido('username')) {
              <span class="form-error">El usuario debe tener entre 3 y 30 caracteres válidos.</span>
            }
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label" for="password">Contraseña</label>
              <input id="password" type="password" class="form-control" formControlName="password" autocomplete="new-password" />
              <span class="form-hint">Mínimo 8 caracteres, con al menos una letra y un número.</span>
              @if (invalido('password')) {
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
          </div>

          <div class="auth-actions">
            <button type="submit" class="btn-uber" [disabled]="cargando()">
              @if (cargando()) {
                <span class="spinner"></span>
              }
              {{ cargando() ? 'Creando cuenta…' : 'Crear cuenta' }}
            </button>
          </div>

          <p class="auth-legal">
            Al crear la cuenta confirmas que leíste el
            <a routerLink="/aviso-privacidad">aviso de privacidad</a>.
          </p>
        </form>

        <div class="auth-links">
          <a routerLink="/login">Ya tengo una cuenta, iniciar sesión</a>
        </div>
      </div>
    </div>
  `,
})
export class RegistroComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  cargando = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group(
    {
      nombres: ['', [Validators.required, Validators.maxLength(100)]],
      apellidos: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      username: [
        '',
        [Validators.required, Validators.minLength(3), Validators.maxLength(30), Validators.pattern(/^[a-zA-Z0-9._-]+$/)],
      ],
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)]],
      confirmar: ['', [Validators.required]],
    },
    { validators: passwordsIguales },
  );

  invalido(campo: string): boolean {
    const control = this.form.get(campo);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.error.set(null);

    const { nombres, apellidos, email, username, password } = this.form.getRawValue();

    this.auth.register({ nombres, apellidos, email, username, password }).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e) => {
        this.error.set(mensajeError(e, 'No se pudo crear la cuenta.'));
        this.cargando.set(false);
      },
    });
  }
}
