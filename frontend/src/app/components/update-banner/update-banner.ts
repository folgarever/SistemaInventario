import { Component, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

// Aviso de actualizacion de la PWA. Cuando el service worker detecta que hay una
// version nueva lista, muestra una franja para recargar la aplicacion. En
// desarrollo (sin service worker) no hace nada.
@Component({
  selector: 'app-update-banner',
  standalone: true,
  templateUrl: './update-banner.html',
  styleUrl: './update-banner.css',
})
export class UpdateBannerComponent {
  private readonly swUpdate = inject(SwUpdate, { optional: true });

  readonly disponible = signal(false);
  readonly actualizando = signal(false);

  constructor() {
    const sw = this.swUpdate;
    if (sw?.isEnabled) {
      sw.versionUpdates
        .pipe(filter((evento): evento is VersionReadyEvent => evento.type === 'VERSION_READY'))
        .subscribe(() => this.disponible.set(true));
    }
  }

  async actualizar(): Promise<void> {
    if (this.actualizando()) return;
    this.actualizando.set(true);
    try {
      await this.swUpdate?.activateUpdate();
    } catch {
      // Si falla la activacion se recarga igual para intentar tomar la version nueva.
    }
    document.location.reload();
  }
}
