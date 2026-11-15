import { Routes } from '@angular/router';

// Rutas de la aplicacion. Los modulos se iran agregando por etapas
// (login, dashboard, productos, categorias, proveedores, entradas,
// salidas, ajustes, movimientos y reportes).
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/inicio/inicio').then((m) => m.InicioComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
