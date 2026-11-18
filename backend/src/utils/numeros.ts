// Utilidades numericas compartidas por los reportes: convierten los valores que
// llegan de la base de datos (que pueden venir como texto) y redondean a dos
// decimales para mantener la precision del dinero.

export function aNumero(valor: number | string | null | undefined): number {
  const n = typeof valor === 'number' ? valor : Number(String(valor ?? '0').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}
