import { Injectable, inject, signal } from '@angular/core';
import { FrecuenciaConteo } from '../core/conteo.utils';
import { AjusteService } from './ajuste.service';

const CLAVE_FRECUENCIA = 'conteo_frecuencia';

// Preferencia del conteo fisico guiado. La frecuencia con la que se cuenta el
// inventario se guarda en el navegador; la fecha del ultimo conteo se consulta
// a la API (el ajuste mas reciente con motivo CONTEO_FISICO) para el recordatorio.
@Injectable({ providedIn: 'root' })
export class ConteoService {
  private ajustes = inject(AjusteService);

  readonly frecuencia = signal<FrecuenciaConteo>(this.leerFrecuencia());
  readonly ultimoConteo = signal<string | null>(null);

  cambiarFrecuencia(frecuencia: FrecuenciaConteo): void {
    this.frecuencia.set(frecuencia);
    this.guardar(CLAVE_FRECUENCIA, frecuencia);
  }

  // Trae la fecha del conteo mas reciente para el recordatorio.
  cargarUltimoConteo(): void {
    this.ajustes.listar({ motivo: 'CONTEO_FISICO', page: 1, limit: 1 }).subscribe({
      next: (res) => this.ultimoConteo.set(res.data.items[0]?.fecha ?? null),
      // El recordatorio es informativo: si falla, se conserva el ultimo valor.
      error: () => undefined,
    });
  }

  private leerFrecuencia(): FrecuenciaConteo {
    const valor = this.leer(CLAVE_FRECUENCIA);
    return valor === 'DIARIO' || valor === 'SEMANAL' || valor === 'QUINCENAL' ? valor : 'SEMANAL';
  }

  private leer(clave: string): string | null {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage.getItem(clave);
    } catch {
      return null;
    }
  }

  private guardar(clave: string, valor: string): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(clave, valor);
    } catch {
      // Sin almacenamiento la preferencia queda solo en memoria.
    }
  }
}
