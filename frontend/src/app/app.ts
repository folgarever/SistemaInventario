import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar';
import { FooterComponent } from './components/footer/footer';
import { ToastComponent } from './components/toast/toast';
import { UpdateBannerComponent } from './components/update-banner/update-banner';
import { NotificacionService } from './services/notificacion.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, ToastComponent, UpdateBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  title = 'Sistema de Inventario';

  private notificaciones = inject(NotificacionService);

  constructor() {
    // Reanuda los avisos de stock bajo si el usuario los tenia activados.
    this.notificaciones.iniciar();
  }
}
