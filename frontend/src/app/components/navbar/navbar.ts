import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth.service';

interface EnlaceNav {
  ruta: string;
  etiqueta: string;
}

// Barra de navegacion negra (identidad visual Uber). En pantallas pequenas los
// enlaces se muestran en un menu desplegable.
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class NavbarComponent {
  readonly titulo = 'Sistema de Inventario';
  readonly auth = inject(AuthService);

  readonly enlaces: EnlaceNav[] = [
    { ruta: '/dashboard', etiqueta: 'Panel' },
    { ruta: '/productos', etiqueta: 'Productos' },
    { ruta: '/movimientos', etiqueta: 'Movimientos' },
    { ruta: '/reportes', etiqueta: 'Reportes' },
    { ruta: '/perfil', etiqueta: 'Perfil' },
  ];

  menuAbierto = signal(false);

  alternarMenu(): void {
    this.menuAbierto.update((v) => !v);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }
}
