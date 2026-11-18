// Utilidades de la lista de compra. Combina los articulos que el usuario agrega
// a mano con las recomendaciones de bajo stock del inventario. Funciones puras
// para poder probarlas y reutilizarlas (tabla, agrupacion y exportacion a PDF).

import { ItemReposicion } from './reposicion.utils';
import { numero } from './formato.utils';

// De donde sale cada linea: del inventario (recomendada) o escrita por el usuario.
export type OrigenCompra = 'RECOMENDADO' | 'MANUAL';

export interface ItemCompra {
  // Clave unica: 'prod:<id>' para recomendados y 'man:<uuid>' para manuales.
  clave: string;
  nombre: string;
  sku: string | null;
  unidad: string;
  cantidad: number;
  proveedor: string | null;
  nota: string | null;
  origen: OrigenCompra;
  // Costo unitario conocido (los recomendados lo traen del producto; los manuales, 0).
  precioCompra: number;
  comprado: boolean;
  // El usuario cambio la cantidad a mano: al refrescar no se pisa.
  editado: boolean;
  // Recomendado que el usuario descarto por ahora (se oculta pero se recuerda).
  descartado: boolean;
}

export interface GrupoCompra {
  proveedor: string;
  items: ItemCompra[];
}

export interface TotalesCompra {
  total: number;
  pendientes: number;
  comprados: number;
  unidadesPendientes: number;
  costoEstimado: number;
}

export const SIN_PROVEEDOR = 'Sin proveedor';

function redondear(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function claveProducto(id: string): string {
  return `prod:${id}`;
}

export function claveManual(id: string): string {
  return `man:${id}`;
}

// Convierte una recomendacion de reposicion en una linea de la lista de compra.
export function itemDesdeReposicion(item: ItemReposicion): ItemCompra {
  return {
    clave: claveProducto(item.id),
    nombre: item.nombre,
    sku: item.sku,
    unidad: item.unidad_medida,
    cantidad: item.sugerido,
    proveedor: item.proveedor,
    nota: null,
    origen: 'RECOMENDADO',
    precioCompra: numero(item.precio_compra),
    comprado: false,
    editado: false,
    descartado: false,
  };
}

// Integra las recomendaciones actuales conservando lo que el usuario hizo con las
// que siguen vigentes (cantidad, nota, marcado y descartado). Las recomendaciones
// que ya no aplican (el producto dejo de estar bajo stock) desaparecen; los
// articulos manuales se mantienen intactos.
export function fusionarRecomendados(actuales: ItemCompra[], nuevos: ItemCompra[]): ItemCompra[] {
  const previos = new Map(
    actuales.filter((i) => i.origen === 'RECOMENDADO').map((i) => [i.clave, i]),
  );

  const recomendados = nuevos.map((nuevo) => {
    const previo = previos.get(nuevo.clave);
    if (!previo) return nuevo;
    return {
      ...nuevo,
      cantidad: previo.editado ? previo.cantidad : nuevo.cantidad,
      nota: previo.nota,
      comprado: previo.comprado,
      editado: previo.editado,
      descartado: previo.descartado,
    };
  });

  const manuales = actuales.filter((i) => i.origen === 'MANUAL');
  return [...recomendados, ...manuales];
}

// Deja solo las lineas que se muestran (sin descartados).
export function itemsVisibles(items: ItemCompra[]): ItemCompra[] {
  return items.filter((item) => !item.descartado);
}

// Agrupa por proveedor (los sin proveedor van al final). Dentro de cada grupo
// primero los pendientes y luego los ya comprados, ambos por nombre.
export function agruparCompras(items: ItemCompra[]): GrupoCompra[] {
  const grupos = new Map<string, ItemCompra[]>();

  for (const item of items) {
    const clave = item.proveedor?.trim() || SIN_PROVEEDOR;
    const lista = grupos.get(clave);
    if (lista) lista.push(item);
    else grupos.set(clave, [item]);
  }

  return Array.from(grupos.entries())
    .map(([proveedor, filas]) => ({
      proveedor,
      items: [...filas].sort((a, b) => {
        if (a.comprado !== b.comprado) return a.comprado ? 1 : -1;
        return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
      }),
    }))
    .sort((a, b) => {
      if (a.proveedor === SIN_PROVEEDOR) return 1;
      if (b.proveedor === SIN_PROVEEDOR) return -1;
      return a.proveedor.localeCompare(b.proveedor, 'es', { sensitivity: 'base' });
    });
}

// Totales de la lista: se cuenta el costo solo de lo pendiente y con precio.
export function totalesCompra(items: ItemCompra[]): TotalesCompra {
  let pendientes = 0;
  let comprados = 0;
  let unidadesPendientes = 0;
  let costoEstimado = 0;

  for (const item of items) {
    if (item.comprado) {
      comprados += 1;
      continue;
    }
    pendientes += 1;
    unidadesPendientes += item.cantidad;
    costoEstimado += item.cantidad * item.precioCompra;
  }

  return {
    total: items.length,
    pendientes,
    comprados,
    unidadesPendientes: redondear(unidadesPendientes),
    costoEstimado: redondear(costoEstimado),
  };
}
