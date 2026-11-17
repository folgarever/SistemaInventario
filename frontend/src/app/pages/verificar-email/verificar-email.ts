import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { mensajeError } from '../../core/api-error.utils';

// Pagina publica a la que llega el usuario desde el enlace del correo.
// Verifica el token automaticamente al abrirse.
@Component({
  selector: 'app-verificar-email',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="auth-shell">
      <div class="auth-card">
        <div class="auth-brand">SI</div>
        <h1 class="auth-title">Verificar correo</h1>
        <p class="auth-subtitle">Estamos confirmando tu dirección de correo.</p>

        @if (cargando()) {
          <div class="table-empty"><span class="spinner"></span></div>
        }

        @if (listo()) {
          <div class="alert alert-success mb-16">
            ¡Listo! Tu correo quedó verificado correctamente.
          </div>
        }

        @if (error()) {
          <div class="alert alert-danger mb-16">{{ error() }}</div>
        }

        <div class="auth-links">
          @if (autenticado()) {
            <a routerLink="/perfil">Ir a mi perfil</a>
          } @else {
            <a routerLink="/login">Ir a iniciar sesión</a>
          }
        </div>
      </div>
    </div>
  `,
})
export class VerificarEmailComponent implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);

  cargando = signal(true);
  listo = signal(false);
  error = signal<string | null>(null);
  autenticado = this.auth.isAuthenticated;

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';

    if (!token) {
      this.cargando.set(false);
      this.error.set('El enlace no es válido o está incompleto.');
      return;
    }

    this.auth.verificarEmail(token).subscribe({
      next: () => {
        this.listo.set(true);
        this.cargando.set(false);
        // Si el usuario tiene sesión abierta, refresca el distintivo del perfil.
        if (this.auth.isAuthenticated()) {
          this.auth.refrescarPerfil().subscribe({ error: () => {} });
        }
      },
      error: (e) => {
        this.error.set(mensajeError(e, 'No se pudo verificar el correo.'));
        this.cargando.set(false);
      },
    });
  }
}
