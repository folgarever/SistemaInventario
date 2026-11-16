import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

// Rutas de la aplicacion. El sistema es sencillo: Panel, Productos,
// Movimientos y Perfil, ademas de las pantallas de acceso.
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/registro').then((m) => m.RegistroComponent),
  },
  {
    path: 'recuperar',
    loadComponent: () => import('./pages/recuperar/recuperar').then((m) => m.RecuperarComponent),
  },
  {
    path: 'restablecer',
    loadComponent: () =>
      import('./pages/restablecer/restablecer').then((m) => m.RestablecerComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardComponent),
  },
  {
    path: 'perfil',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/perfil/perfil').then((m) => m.PerfilComponent),
  },
  {
    path: 'productos',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/productos/productos').then((m) => m.ProductosComponent),
  },
  {
    path: 'movimientos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/movimientos/movimientos').then((m) => m.MovimientosComponent),
  },
  {
    path: 'reportes',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/reportes/reportes').then((m) => m.ReportesComponent),
  },
  {
    path: 'aviso-privacidad',
    loadComponent: () =>
      import('./pages/aviso-privacidad/aviso-privacidad').then((m) => m.AvisoPrivacidadComponent),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/no-encontrado/no-encontrado').then((m) => m.NoEncontradoComponent),
  },
];
