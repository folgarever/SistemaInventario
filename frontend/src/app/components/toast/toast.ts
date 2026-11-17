import { Component, inject } from '@angular/core';
import { TipoToast, ToastService } from '../../core/toast.service';

// Contenedor global de notificaciones. Se monta una sola vez en el componente
// raiz y muestra los avisos emitidos por ToastService.
@Component({
  selector: 'app-toast',
  standalone: true,
  templateUrl: './toast.html',
  styleUrl: './toast.css',
})
export class ToastComponent {
  readonly toasts = inject(ToastService);

  icono(tipo: TipoToast): string {
    if (tipo === 'success') return '✓';
    if (tipo === 'error') return '!';
    return 'i';
  }
}
