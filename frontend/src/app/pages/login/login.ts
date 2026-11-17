import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { mensajeError } from '../../core/api-error.utils';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-shell">
      <div class="auth-card">
        <div class="auth-brand brand-logo" aria-hidden="true"></div>
        <h1 class="auth-title">Iniciar sesión</h1>
        <p class="auth-subtitle">Accede para administrar el inventario de tu tienda.</p>

        @if (error()) {
          <div class="alert alert-danger mb-16">{{ error() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="enviar()">
          <div class="form-group">
            <label class="form-label" for="usernameOrEmail">Usuario o correo</label>
            <input
              id="usernameOrEmail"
              type="text"
              class="form-control"
              formControlName="usernameOrEmail"
              autocomplete="username"
              placeholder="usuario o correo@ejemplo.com"
            />
            @if (invalido('usernameOrEmail')) {
              <span class="form-error">Ingresa tu usuario o correo.</span>
            }
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Contraseña</label>
            <input
              id="password"
              type="password"
              class="form-control"
              formControlName="password"
              autocomplete="current-password"
              placeholder="••••••••"
            />
            @if (invalido('password')) {
              <span class="form-error">Ingresa tu contraseña.</span>
            }
          </div>

          <div class="auth-actions">
            <button type="submit" class="btn-uber" [disabled]="cargando()">
              @if (cargando()) {
                <span class="spinner"></span>
              }
              {{ cargando() ? 'Ingresando…' : 'Ingresar' }}
            </button>
          </div>
        </form>

        <div class="auth-links">
          <a routerLink="/recuperar">¿Olvidaste tu contraseña?</a>
          <a routerLink="/registro">Crear una cuenta nueva</a>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  cargando = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    usernameOrEmail: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

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

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (e) => {
        this.error.set(mensajeError(e, 'No se pudo iniciar sesión.'));
        this.cargando.set(false);
      },
    });
  }
}
