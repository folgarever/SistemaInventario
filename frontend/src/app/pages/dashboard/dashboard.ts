import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

// Dashboard provisional. En la etapa de alertas y dashboard se reemplazara por
// los indicadores reales (stock bajo, movimientos recientes, totales, etc.).
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Hola, {{ usuario()?.nombres ?? 'bienvenido' }}</h1>
          <p class="page-subtitle">Panel principal del sistema de inventario.</p>
        </div>
        <a routerLink="/perfil" class="btn-uber-outline btn-uber btn-sm">Mi perfil</a>
      </div>

      <div class="card">
        <div class="card-header">
          <h2 class="section-title">Sesión iniciada</h2>
          <span class="badge badge-disponible"><span class="badge-dot"></span>Autenticado</span>
        </div>
        <p class="text-muted">
          La autenticación está funcionando. Los indicadores del dashboard, las alertas y los
          módulos de inventario se habilitarán en las siguientes etapas.
        </p>
        <div class="alert mt-16">
          <span>
            Próximas etapas: categorías, proveedores, productos, entradas, salidas, ajustes,
            historial de movimientos, alertas, dashboard y reportes.
          </span>
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent {
  private auth = inject(AuthService);
  usuario = this.auth.currentUser;
}
