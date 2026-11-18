import { Component, computed, inject, signal } from '@angular/core';
import { ModalComponent } from '../modal/modal';
import { PwaInstallService } from '../../core/pwa-install.service';

// Boton para instalar la aplicacion (PWA). Aparece en la barra superior cuando
// el navegador permite instalarla. En iPhone/iPad, que no ofrecen el aviso
// automatico, se abre una ventana con las instrucciones.
@Component({
  selector: 'app-instalar-pwa',
  standalone: true,
  imports: [ModalComponent],
  template: `
    @if (mostrar()) {
      <button
        type="button"
        class="btn-instalar"
        (click)="accionar()"
        title="Instalar la aplicacion en este dispositivo"
      >
        <span class="btn-instalar-icono" aria-hidden="true">⤓</span>
        <span class="btn-instalar-texto">Instalar app</span>
      </button>
    }

    @if (mostrandoAyuda()) {
      <app-modal titulo="Instalar en el iPhone o iPad" (cerrar)="cerrarAyuda()">
        <p class="mb-16">
          Safari no permite instalar la aplicacion con un boton. Hazlo en unos segundos:
        </p>
        <ol class="pasos-instalar">
          <li>Toca el boton <strong>Compartir</strong> de Safari.</li>
          <li>Elige <strong>Añadir a pantalla de inicio</strong>.</li>
          <li>Confirma con <strong>Añadir</strong>.</li>
        </ol>
        <p class="text-muted mb-0">
          Al terminar, la aplicacion aparecera como un icono mas en tu pantalla de inicio.
        </p>
      </app-modal>
    }
  `,
  styles: [
    `
      .btn-instalar {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        flex: none;
        padding: 7px 14px;
        border: none;
        border-radius: var(--radius-uber);
        background-color: var(--color-white);
        color: var(--color-black);
        font-family: inherit;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: var(--transition);
      }
      .btn-instalar:hover {
        background-color: var(--color-gray-hover);
      }
      .btn-instalar:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.4);
      }
      .btn-instalar-icono {
        font-size: 15px;
        line-height: 1;
      }
      .pasos-instalar {
        margin: 0 0 16px;
        padding-left: 20px;
      }
      .pasos-instalar li {
        margin-bottom: 8px;
      }
      @media (max-width: 560px) {
        .btn-instalar-texto {
          display: none;
        }
        .btn-instalar {
          padding: 7px 11px;
        }
      }
    `,
  ],
})
export class InstalarPwaComponent {
  readonly pwa = inject(PwaInstallService);
  readonly mostrandoAyuda = signal(false);
  readonly mostrar = computed(() => this.pwa.mostrarBoton());

  accionar(): void {
    if (this.pwa.puedeInstalar()) {
      void this.pwa.instalar();
      return;
    }
    // Sin dialogo nativo (iOS): se muestran las instrucciones.
    this.mostrandoAyuda.set(true);
  }

  cerrarAyuda(): void {
    this.mostrandoAyuda.set(false);
  }
}
