// Reglas de la devolucion de mercaderia. Una devolucion reingresa al
// inventario la cantidad indicada, por lo que las existencias resultantes son
// el stock actual mas lo devuelto.

export function existenciasTrasDevolucion(stockActual: number, cantidad: number): number {
  const stock = Number.isFinite(stockActual) && stockActual > 0 ? stockActual : 0;
  const devuelto = Number.isFinite(cantidad) && cantidad > 0 ? cantidad : 0;
  return Math.round((stock + devuelto) * 1000) / 1000;
}
