import { Component, input, output } from '@angular/core';

// Ventana modal reutilizable con proyeccion de contenido.
@Component({
  selector: 'app-modal',
  standalone: true,
  template: `
    <div class="modal-backdrop" (click)="alClicFondo($event)">
      <div class="modal-panel" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h2 class="section-title">{{ titulo() }}</h2>
          <button type="button" class="modal-close" aria-label="Cerrar" (click)="cerrar.emit()">
            ✕
          </button>
        </div>
        <div class="modal-body">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
})
export class ModalComponent {
  titulo = input('');
  cerrar = output<void>();

  alClicFondo(evento: MouseEvent): void {
    if (evento.target === evento.currentTarget) {
      this.cerrar.emit();
    }
  }
}
