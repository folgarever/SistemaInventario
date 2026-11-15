import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

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
        <a routerLink="/dashboard" class="btn-uber">Ir al panel principal</a>
      </div>
    </div>
  `,
})
export class NoEncontradoComponent {}
