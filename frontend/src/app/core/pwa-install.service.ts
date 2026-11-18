import { Injectable, signal } from '@angular/core';

// Evento que dispara Chrome/Edge cuando la app cumple los requisitos para
// instalarse. No esta en los tipos del DOM, por eso se declara aqui.
interface EventoInstalacion extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type ResultadoInstalacion = 'accepted' | 'dismissed' | 'no-disponible';

// Estado de instalacion de la PWA. El navegador avisa con beforeinstallprompt
// cuando se puede mostrar el boton; en iOS ese evento no existe, asi que se
// detecta aparte para guiar al usuario con instrucciones.
@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  readonly puedeInstalar = signal(false);
  readonly instalado = signal(false);
  readonly esIOS = signal(false);

  private evento: EventoInstalacion | null = null;

  constructor() {
    if (typeof window === 'undefined') return;

    this.instalado.set(this.enModoApp());
    this.esIOS.set(this.detectarIOS() && !this.instalado());

    window.addEventListener('beforeinstallprompt', (e) => {
      // Se evita el mini-aviso del navegador para usar nuestro propio boton.
      e.preventDefault();
      this.evento = e as EventoInstalacion;
      this.puedeInstalar.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.evento = null;
      this.puedeInstalar.set(false);
      this.instalado.set(true);
    });
  }

  // Muestra el dialogo nativo de instalacion. Devuelve la decision del usuario.
  async instalar(): Promise<ResultadoInstalacion> {
    const evento = this.evento;
    if (!evento) return 'no-disponible';

    await evento.prompt();
    const eleccion = await evento.userChoice;
    this.evento = null;
    this.puedeInstalar.set(false);
    if (eleccion.outcome === 'accepted') {
      this.instalado.set(true);
    }
    return eleccion.outcome;
  }

  // Verdadero si conviene ofrecer el boton: se puede instalar o hay que guiar
  // en iOS, y todavia no esta instalada.
  mostrarBoton(): boolean {
    return !this.instalado() && (this.puedeInstalar() || this.esIOS());
  }

  private enModoApp(): boolean {
    const media = window.matchMedia?.('(display-mode: standalone)');
    return media?.matches === true || (navigator as { standalone?: boolean }).standalone === true;
  }

  private detectarIOS(): boolean {
    const ua = navigator.userAgent || '';
    return /iphone|ipad|ipod/i.test(ua);
  }
}
