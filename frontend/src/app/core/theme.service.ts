import { Injectable, signal } from '@angular/core';

export type Tema = 'light' | 'dark';

const CLAVE = 'sistema_inventario_tema';

// Gestiona el tema claro/oscuro. La preferencia se guarda en el navegador y,
// si no existe, se toma la del sistema operativo. El atributo data-theme se
// aplica sobre <html> para que el CSS cambie los tokens de color.
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly tema = signal<Tema>(this.leerTema());

  constructor() {
    this.aplicar(this.tema());
  }

  alternar(): void {
    this.establecer(this.tema() === 'dark' ? 'light' : 'dark');
  }

  establecer(tema: Tema): void {
    this.tema.set(tema);
    this.aplicar(tema);
    try {
      localStorage.setItem(CLAVE, tema);
    } catch {
      // Sin almacenamiento la preferencia solo dura la sesion.
    }
  }

  private aplicar(tema: Tema): void {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', tema);
    }
  }

  private leerTema(): Tema {
    try {
      const guardado = localStorage.getItem(CLAVE);
      if (guardado === 'light' || guardado === 'dark') return guardado;
    } catch {
      // Continua con la preferencia del sistema.
    }
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }
}
