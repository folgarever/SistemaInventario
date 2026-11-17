import { Injectable, signal } from '@angular/core';

export type TipoToast = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  mensaje: string;
  tipo: TipoToast;
}

// Duracion en milisegundos que permanece visible cada tipo de aviso.
const DURACION: Record<TipoToast, number> = {
  success: 4000,
  info: 4500,
  error: 6000,
};

// Notificaciones efimeras (toasts) para confirmar acciones o avisar de errores
// puntuales. Se muestran en una esquina y se cierran solas tras unos segundos.
@Injectable({ providedIn: 'root' })
export class ToastService {
  private contador = 0;
  readonly toasts = signal<Toast[]>([]);

  exito(mensaje: string): void {
    this.mostrar(mensaje, 'success');
  }

  error(mensaje: string): void {
    this.mostrar(mensaje, 'error');
  }

  info(mensaje: string): void {
    this.mostrar(mensaje, 'info');
  }

  mostrar(mensaje: string, tipo: TipoToast = 'info'): number {
    const id = ++this.contador;
    this.toasts.update((lista) => [...lista, { id, mensaje, tipo }]);
    setTimeout(() => this.cerrar(id), DURACION[tipo]);
    return id;
  }

  cerrar(id: number): void {
    this.toasts.update((lista) => lista.filter((t) => t.id !== id));
  }
}
