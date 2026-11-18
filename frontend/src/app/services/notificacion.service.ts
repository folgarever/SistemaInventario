import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { AlertasDashboard } from '../models';
import { alertasNuevas, firmaAlertas, resumenNotificacion } from '../core/notificaciones.utils';
import { AlertaService } from './alerta.service';

const CLAVE_HABILITADO = 'notif_stock_habilitado';
const CLAVE_FIRMA = 'notif_stock_firma';
// Cada cuanto se revisan las alertas mientras la aplicacion esta abierta.
const INTERVALO_MS = 5 * 60 * 1000;

// Avisos locales de stock bajo: pide permiso de notificaciones y avisa cuando
// un producto se agota o baja del minimo, mientras la aplicacion este abierta.
// No requiere backend ni claves: usa el service worker de la PWA y, como
// respaldo, el API de Notification del navegador.
@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private alertas = inject(AlertaService);

  // El navegador debe exponer el API de Notification.
  readonly soportado = typeof window !== 'undefined' && 'Notification' in window;
  readonly permiso = signal<NotificationPermission>(this.permisoActual());
  readonly habilitado = signal(this.leerBandera(CLAVE_HABILITADO));

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Reacciona a cada actualizacion de alertas que haga el resto de la app.
    effect(() => {
      const actuales = this.alertas.ultimas();
      if (actuales) this.procesar(actuales);
    });

    inject(DestroyRef).onDestroy(() => this.detener());
  }

  // Reanuda los avisos si el usuario los tenia activados (se llama al arrancar).
  iniciar(): void {
    if (!this.soportado || !this.habilitado()) return;
    this.permiso.set(this.permisoActual());
    if (this.permiso() !== 'granted') return;
    this.alertas.cargar();
    this.iniciarTimer();
  }

  // Pide permiso al navegador y activa los avisos. Devuelve true si quedo activo.
  async activar(): Promise<boolean> {
    if (!this.soportado) return false;

    let permiso: NotificationPermission = this.permisoActual();
    try {
      permiso = await Notification.requestPermission();
    } catch {
      // Algunos navegadores no exponen requestPermission; conservamos el actual.
    }
    this.permiso.set(permiso);

    if (permiso !== 'granted') return false;

    this.habilitado.set(true);
    this.guardarBandera(CLAVE_HABILITADO, true);
    this.iniciar();
    return true;
  }

  desactivar(): void {
    this.habilitado.set(false);
    this.guardarBandera(CLAVE_HABILITADO, false);
    this.detener();
    this.borrar(CLAVE_FIRMA);
  }

  // Compara las alertas con el ultimo aviso y notifica solo las novedades.
  procesar(alertas: AlertasDashboard): void {
    if (!this.soportado || !this.habilitado() || this.permiso() !== 'granted') return;

    const items = alertas.items ?? [];
    const previas = this.leerFirma();
    const nuevas = alertasNuevas(items, previas);

    if (nuevas.length > 0) {
      const resumen = resumenNotificacion(nuevas);
      if (resumen) void this.mostrar(resumen.titulo, resumen.cuerpo);
    }

    this.guardarFirma(firmaAlertas(items));
  }

  // Muestra la notificacion con el service worker si esta disponible.
  private async mostrar(titulo: string, cuerpo: string): Promise<void> {
    const opciones: NotificationOptions = {
      body: cuerpo,
      tag: 'stock-bajo',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    };

    try {
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const registro = await navigator.serviceWorker.getRegistration();
        if (registro) {
          await registro.showNotification(titulo, opciones);
          return;
        }
      }
      new Notification(titulo, opciones);
    } catch {
      // Si el navegador bloquea la notificacion, la app sigue funcionando.
    }
  }

  private iniciarTimer(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.alertas.cargar(), INTERVALO_MS);
  }

  private detener(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private permisoActual(): NotificationPermission {
    return typeof Notification === 'undefined' ? 'denied' : Notification.permission;
  }

  private leerFirma(): Record<string, string> {
    const crudo = this.leer(CLAVE_FIRMA);
    if (!crudo) return {};
    try {
      const valor = JSON.parse(crudo);
      return valor && typeof valor === 'object' ? (valor as Record<string, string>) : {};
    } catch {
      return {};
    }
  }

  private guardarFirma(firma: Record<string, string>): void {
    this.guardar(CLAVE_FIRMA, JSON.stringify(firma));
  }

  private leerBandera(clave: string): boolean {
    return this.leer(clave) === 'true';
  }

  private guardarBandera(clave: string, valor: boolean): void {
    this.guardar(clave, valor ? 'true' : 'false');
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
      // Sin almacenamiento no persistimos; los avisos siguen en memoria.
    }
  }

  private borrar(clave: string): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(clave);
    } catch {
      // Ignorado.
    }
  }
}
