import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { mensajeError } from '../../core/api-error.utils';

@Component({
  selector: 'app-recuperar',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-shell">
      <div class="auth-card">
        <div class="auth-brand brand-logo" aria-hidden="true"></div>
        <h1 class="auth-title">Recuperar contraseña</h1>
        <p class="auth-subtitle">
          Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
        </p>

        @if (enviado()) {
          <div class="alert alert-success mb-16">
            Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.
          </div>
        }

        @if (error()) {
          <div class="alert alert-danger mb-16">{{ error() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="enviar()">
          <div class="form-group">
            <label class="form-label" for="email">Correo electrónico</label>
            <input id="email" type="email" class="form-control" formControlName="email" autocomplete="email" />
            @if (invalido()) {
              <span class="form-error">Ingresa un correo válido.</span>
            }
          </div>

          <div class="auth-actions">
            <button type="submit" class="btn-uber" [disabled]="cargando()">
              @if (cargando()) {
                <span class="spinner"></span>
              }
              {{ cargando() ? 'Enviando…' : 'Enviar enlace' }}
            </button>
          </div>
        </form>

        <div class="auth-links">
          <a routerLink="/login">Volver a iniciar sesión</a>
        </div>
      </div>
    </div>
  `,
})
export class RecuperarComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  cargando = signal(false);
  enviado = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  invalido(): boolean {
    const control = this.form.get('email');
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando.set(true);
    this.error.set(null);

    this.auth.solicitarRestablecimiento(this.form.getRawValue().email).subscribe({
      next: () => {
        this.enviado.set(true);
        this.cargando.set(false);
        this.form.reset();
      },
      error: (e) => {
        this.error.set(mensajeError(e, 'No se pudo procesar la solicitud.'));
        this.cargando.set(false);
      },
    });
  }
}
