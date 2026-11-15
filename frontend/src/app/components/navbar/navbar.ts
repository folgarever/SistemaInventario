import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Barra de navegacion negra (identidad visual Uber). Las opciones de los
// modulos se habilitaran conforme se implementen las etapas del sistema.
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class NavbarComponent {
  readonly titulo = 'Sistema de Inventario';
}
