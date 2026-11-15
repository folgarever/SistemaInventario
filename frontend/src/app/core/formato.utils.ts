// Utilidades de formato numerico y de estado de existencias.

// Normaliza un valor numerico que puede llegar como cadena desde la API.
export function numero(valor: number | string | null | undefined): number {
  if (valor === null || valor === undefined || valor === '') return 0;
  const n = typeof valor === 'number' ? valor : Number(String(valor).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

// Formatea un valor monetario con dos decimales (sin simbolo de moneda).
export function formatoMoneda(valor: number | string | null | undefined): string {
  return numero(valor).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Formatea una cantidad admitiendo hasta tres decimales.
export function formatoCantidad(valor: number | string | null | undefined): string {
  return numero(valor).toLocaleString('es-ES', { maximumFractionDigits: 3 });
}

export type EstadoStock = 'agotado' | 'bajo' | 'disponible';

// Determina el estado de existencias de un producto.
export function estadoStock(
  stock: number | string | null | undefined,
  stockMinimo: number | string | null | undefined,
): EstadoStock {
  const s = numero(stock);
  const min = numero(stockMinimo);
  if (s <= 0) return 'agotado';
  if (s <= min) return 'bajo';
  return 'disponible';
}

export function etiquetaEstadoStock(estado: EstadoStock): string {
  if (estado === 'agotado') return 'Agotado';
  if (estado === 'bajo') return 'Bajo stock';
  return 'Disponible';
}
