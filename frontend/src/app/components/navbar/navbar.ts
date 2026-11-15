import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth.service';

// Barra de navegacion negra (identidad visual Uber). Muestra las opciones de
// autenticacion cuando no hay sesion y los enlaces de los modulos cuando la hay.
// Las opciones de los modulos se iran habilitando conforme se implementen.
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
}
