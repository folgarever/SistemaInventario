// Utilidades del conteo fisico guiado. Funciones puras para poder probarlas
// sin depender del navegador ni de la API.
import { numero } from './formato.utils';

// Con que frecuencia el negocio cuenta el inventario.
export type FrecuenciaConteo = 'DIARIO' | 'SEMANAL' | 'QUINCENAL';

export interface OpcionFrecuencia {
  valor: FrecuenciaConteo;
  etiqueta: string;
  dias: number;
}

export const FRECUENCIAS: OpcionFrecuencia[] = [
  { valor: 'DIARIO', etiqueta: 'Diario', dias: 1 },
  { valor: 'SEMANAL', etiqueta: 'Semanal', dias: 7 },
  { valor: 'QUINCENAL', etiqueta: 'Quincenal', dias: 15 },
];

export function diasDeFrecuencia(frecuencia: FrecuenciaConteo): number {
  return FRECUENCIAS.find((f) => f.valor === frecuencia)?.dias ?? 7;
}

export function etiquetaFrecuencia(frecuencia: FrecuenciaConteo): string {
  return FRECUENCIAS.find((f) => f.valor === frecuencia)?.etiqueta ?? 'Semanal';
}

function inicioDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

// Fecha en la que corresponde el proximo conteo, contada desde el ultimo.
// Devuelve null si nunca se registro un conteo.
export function proximoConteo(
  ultimo: string | Date | null | undefined,
  frecuencia: FrecuenciaConteo,
): Date | null {
  if (!ultimo) return null;
  const base = ultimo instanceof Date ? ultimo : new Date(ultimo);
  if (isNaN(base.getTime())) return null;
  const proximo = inicioDelDia(base);
  proximo.setDate(proximo.getDate() + diasDeFrecuencia(frecuencia));
  return proximo;
}

export interface EstadoConteo {
  // Si nunca se registro un conteo, no hay fecha base para el recordatorio.
  tieneBase: boolean;
  vencido: boolean;
  // Dias que faltan para el proximo conteo (negativo si ya vencio).
  diasRestantes: number;
}

// Estado del recordatorio segun la fecha del ultimo conteo y la frecuencia.
export function estadoConteo(
  ultimo: string | Date | null | undefined,
  frecuencia: FrecuenciaConteo,
  hoy: Date = new Date(),
): EstadoConteo {
  const proximo = proximoConteo(ultimo, frecuencia);
  if (!proximo) return { tieneBase: false, vencido: false, diasRestantes: 0 };
  const dias = Math.round((proximo.getTime() - inicioDelDia(hoy).getTime()) / 86400000);
  return { tieneBase: true, vencido: dias < 0, diasRestantes: dias };
}

// Diferencia entre lo contado y las existencias del sistema.
// Positiva = sobrante; negativa = faltante.
export function diferenciaConteo(contado: number | string, sistema: number | string): number {
  return Math.round((numero(contado) - numero(sistema)) * 1000) / 1000;
}

export interface ResumenConteo {
  // Lineas que ya tienen una cantidad contada (distinta de vacio).
  contados: number;
  diferencias: number;
  sobrantes: number;
  faltantes: number;
}

// Resume el avance del conteo: cuantas lineas se contaron y cuantas difieren.
export function resumenConteo(
  lineas: { contado: number | string | null | undefined; sistema: number | string }[],
): ResumenConteo {
  let contados = 0;
  let diferencias = 0;
  let sobrantes = 0;
  let faltantes = 0;

  for (const linea of lineas) {
    if (linea.contado === '' || linea.contado === null || linea.contado === undefined) continue;
    contados++;
    const diferencia = diferenciaConteo(linea.contado, linea.sistema);
    if (diferencia === 0) continue;
    diferencias++;
    if (diferencia > 0) sobrantes++;
    else faltantes++;
  }

  return { contados, diferencias, sobrantes, faltantes };
}
