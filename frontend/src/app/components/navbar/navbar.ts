import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ThemeService } from '../../core/theme.service';
import { AlertaService } from '../../services/alerta.service';

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
  readonly alertas = inject(AlertaService);
  readonly tema = inject(ThemeService);

  readonly enlaces: EnlaceNav[] = [
    { ruta: '/dashboard', etiqueta: 'Panel' },
    { ruta: '/productos', etiqueta: 'Productos' },
    { ruta: '/movimientos', etiqueta: 'Movimientos' },
    { ruta: '/conteo', etiqueta: 'Conteo' },
    { ruta: '/compras', etiqueta: 'Compras' },
    { ruta: '/reportes', etiqueta: 'Reportes' },
    { ruta: '/perfil', etiqueta: 'Perfil' },
  ];

  menuAbierto = signal(false);

  constructor() {
    // Carga el conteo de alertas al iniciar sesion y lo limpia al salir.
    effect(() => {
      if (this.auth.isAuthenticated()) {
        this.alertas.cargar();
      } else {
        this.alertas.limpiar();
      }
    });
  }

  alternarMenu(): void {
    this.menuAbierto.update((v) => !v);
  }

  alternarTema(): void {
    this.tema.alternar();
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }
}
