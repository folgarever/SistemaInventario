// Utilidades de los avisos de stock bajo. Son funciones puras para poder
// probarlas sin depender del navegador ni del service worker.
import { AlertaStock } from '../models';
import { formatoCantidad } from './formato.utils';

export interface ResumenNotificacion {
  titulo: string;
  cuerpo: string;
}

// Firma del estado de las alertas (producto -> estado). Permite detectar que
// productos son nuevos o cambiaron de estado desde el ultimo aviso.
export function firmaAlertas(items: AlertaStock[]): Record<string, string> {
  const firma: Record<string, string> = {};
  for (const item of items) {
    firma[item.id] = item.estado;
  }
  return firma;
}

// Devuelve las alertas que no estaban en la firma previa o que cambiaron de
// estado (por ejemplo, de "bajo" a "agotado").
export function alertasNuevas(items: AlertaStock[], previas: Record<string, string>): AlertaStock[] {
  return items.filter((item) => previas[item.id] !== item.estado);
}

// Arma el titulo y el cuerpo de la notificacion a partir de las alertas nuevas.
export function resumenNotificacion(nuevas: AlertaStock[]): ResumenNotificacion | null {
  if (nuevas.length === 0) return null;

  if (nuevas.length === 1) {
    const a = nuevas[0];
    return {
      titulo: a.estado === 'AGOTADO' ? 'Producto agotado' : 'Stock bajo',
      cuerpo:
        `${a.nombre} (${a.sku}): quedan ${formatoCantidad(a.stock)} ${a.unidad_medida}, ` +
        `mínimo ${formatoCantidad(a.stock_minimo)}.`,
    };
  }

  const agotados = nuevas.filter((a) => a.estado === 'AGOTADO').length;
  const nombres = nuevas
    .slice(0, 3)
    .map((a) => a.nombre)
    .join(', ');
  const resto = nuevas.length > 3 ? ` y ${nuevas.length - 3} más` : '';
  const detalle = agotados > 0 ? ` · ${agotados} agotado${agotados === 1 ? '' : 's'}` : '';

  return {
    titulo: `${nuevas.length} productos requieren reposición`,
    cuerpo: `${nombres}${resto}${detalle}.`,
  };
}
