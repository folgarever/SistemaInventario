import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

// Pagina 404 personalizada. Ofrece un acceso coherente segun la sesion:
// al panel si hay sesion iniciada, o al inicio de sesion si no la hay.
@Component({
  selector: 'app-no-encontrado',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="auth-shell">
      <div class="auth-card" style="text-align: center;">
        <div class="auth-brand" style="margin-inline: auto;">404</div>
        <h1 class="auth-title">Página no encontrada</h1>
        <p class="auth-subtitle">La página que buscas no existe o fue movida.</p>
        @if (auth.isAuthenticated()) {
          <a routerLink="/dashboard" class="btn-uber">Ir al panel principal</a>
        } @else {
          <a routerLink="/login" class="btn-uber">Iniciar sesión</a>
        }
      </div>
    </div>
  `,
})
export class NoEncontradoComponent {
  readonly auth = inject(AuthService);
}
