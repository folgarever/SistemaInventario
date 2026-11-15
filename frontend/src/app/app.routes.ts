import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

// Rutas de la aplicacion. Los modulos se iran agregando por etapas
// (productos, categorias, proveedores, entradas, salidas, ajustes,
// movimientos y reportes).
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
    path: 'categorias',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/categorias/categorias').then((m) => m.CategoriasComponent),
  },
  {
    path: 'proveedores',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/proveedores/proveedores').then((m) => m.ProveedoresComponent),
  },
  {
    path: 'productos',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/productos/productos').then((m) => m.ProductosComponent),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/no-encontrado/no-encontrado').then((m) => m.NoEncontradoComponent),
  },
];
