import { Component } from '@angular/core';

// Pagina de inicio provisional de la etapa 1.
// Se reemplazara por el login y el dashboard en las siguientes etapas.
@Component({
  selector: 'app-inicio',
  standalone: true,
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Sistema de Inventario</h1>
          <p class="page-subtitle">
            Base del proyecto lista. Los módulos se implementarán por etapas.
          </p>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2 class="section-title">Etapa 1 completada</h2>
          <span class="badge badge-neutral"><span class="badge-dot"></span>Estructura base</span>
        </div>
        <p class="text-muted">
          Se configuró la arquitectura del proyecto (frontend Angular, backend Express y
          base de datos Supabase) junto con el esquema transaccional de inventario.
        </p>
        <div class="alert mt-16">
          <span>
            Próximas etapas: autenticación, categorías, proveedores, productos, entradas,
            salidas, ajustes, historial, alertas, dashboard y reportes.
          </span>
        </div>
      </div>
    </div>
  `,
})
export class InicioComponent {}
