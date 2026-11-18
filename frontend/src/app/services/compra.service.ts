import { Injectable, signal } from '@angular/core';
import { ItemCompra, fusionarRecomendados } from '../core/compras.utils';

const CLAVE = 'lista_compra';

// Estado de la lista de compra. Se guarda en el navegador (localStorage) porque
// es una lista de trabajo del usuario, no un dato del inventario: no toca la base
// de datos ni el stock. Los recomendados se reinyectan desde el inventario.
@Injectable({ providedIn: 'root' })
export class CompraService {
  readonly items = signal<ItemCompra[]>(this.leer());

  // Integra las recomendaciones actuales conservando lo que el usuario ya hizo.
  sincronizarRecomendados(nuevos: ItemCompra[]): void {
    this.items.update((actual) => fusionarRecomendados(actual, nuevos));
    this.persistir();
  }

  agregar(item: ItemCompra): void {
    this.items.update((actual) => [...actual, item]);
    this.persistir();
  }

  actualizar(
    clave: string,
    cambios: Partial<Pick<ItemCompra, 'cantidad' | 'nota' | 'comprado' | 'editado' | 'descartado'>>,
  ): void {
    this.items.update((actual) =>
      actual.map((item) => (item.clave === clave ? { ...item, ...cambios } : item)),
    );
    this.persistir();
  }

  eliminar(clave: string): void {
    this.items.update((actual) => actual.filter((item) => item.clave !== clave));
    this.persistir();
  }

  quitarComprados(): void {
    this.items.update((actual) => actual.filter((item) => !item.comprado));
    this.persistir();
  }

  restaurarDescartados(): void {
    this.items.update((actual) =>
      actual.map((item) => (item.descartado ? { ...item, descartado: false } : item)),
    );
    this.persistir();
  }

  private leer(): ItemCompra[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const bruto = localStorage.getItem(CLAVE);
      if (!bruto) return [];
      const datos: unknown = JSON.parse(bruto);
      return Array.isArray(datos) ? datos.filter(esItemCompra) : [];
    } catch {
      return [];
    }
  }

  private persistir(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CLAVE, JSON.stringify(this.items()));
      }
    } catch {
      // Sin almacenamiento la lista queda solo en memoria.
    }
  }
}

// Validacion minima para descartar datos corruptos del almacenamiento.
function esItemCompra(valor: unknown): valor is ItemCompra {
  if (typeof valor !== 'object' || valor === null) return false;
  const item = valor as Record<string, unknown>;
  const origen = item['origen'];
  return (
    typeof item['clave'] === 'string' &&
    typeof item['nombre'] === 'string' &&
    typeof item['cantidad'] === 'number' &&
    (origen === 'RECOMENDADO' || origen === 'MANUAL')
  );
}
