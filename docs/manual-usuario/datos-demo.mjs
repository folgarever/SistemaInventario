// Datos de demostracion para las capturas del manual. NO toca Supabase: el
// script capturas.mjs intercepta las llamadas a /api/** y responde desde aqui.

const USUARIO_ID = 'demo-usuario';

const USUARIO = {
  id: USUARIO_ID,
  nombres: 'Ana',
  apellidos: 'Gomez',
  email: 'ana@tienda.com',
  username: 'ana',
  activo: true,
};

const CATEGORIAS = [
  { id: 'c1', nombre: 'Bebidas', descripcion: 'Aguas, gaseosas y jugos', activo: true },
  { id: 'c2', nombre: 'Abarrotes', descripcion: 'Granos, azúcar y aceites', activo: true },
  { id: 'c3', nombre: 'Limpieza', descripcion: 'Detergentes y aseo personal', activo: true },
  { id: 'c4', nombre: 'Snacks', descripcion: 'Papas, chocolates y golosinas', activo: true },
];

const PROVEEDORES = [
  { id: 'pr1', nombre: 'Distribuidora Andina', contacto: 'Luis Perez', activo: true },
  { id: 'pr2', nombre: 'Comercial del Sur', contacto: 'Marta Rojas', activo: true },
  { id: 'pr3', nombre: 'Alimentos del Valle', contacto: 'Jorge Lima', activo: true },
];

// Productos base; los valores derivados (estado y valorizacion) se calculan.
const BASE_PRODUCTOS = [
  { id: 'p1', sku: 'BEB-001', nombre: 'Agua mineral 600 ml', c: 'c1', p: 'pr1', u: 'unidad', pc: 2.5, pv: 4.0, stock: 48, min: 24 },
  { id: 'p2', sku: 'BEB-002', nombre: 'Gaseosa cola 1.5 L', c: 'c1', p: 'pr1', u: 'unidad', pc: 6.0, pv: 9.5, stock: 12, min: 18 },
  { id: 'p3', sku: 'BEB-003', nombre: 'Jugo de naranja 1 L', c: 'c1', p: 'pr2', u: 'unidad', pc: 5.5, pv: 8.0, stock: 0, min: 12 },
  { id: 'p4', sku: 'ABA-001', nombre: 'Arroz extra 1 kg', c: 'c2', p: 'pr3', u: 'kg', pc: 4.2, pv: 6.0, stock: 60, min: 30 },
  { id: 'p5', sku: 'ABA-002', nombre: 'Azúcar refinada 1 kg', c: 'c2', p: 'pr3', u: 'kg', pc: 3.8, pv: 5.5, stock: 22, min: 25 },
  { id: 'p6', sku: 'ABA-003', nombre: 'Aceite de girasol 900 ml', c: 'c2', p: 'pr3', u: 'unidad', pc: 9.0, pv: 12.5, stock: 30, min: 15 },
  { id: 'p7', sku: 'LIM-001', nombre: 'Detergente en polvo 900 g', c: 'c3', p: 'pr2', u: 'unidad', pc: 7.5, pv: 11.0, stock: 18, min: 10 },
  { id: 'p8', sku: 'LIM-002', nombre: 'Jabón de tocador', c: 'c3', p: 'pr2', u: 'unidad', pc: 2.0, pv: 3.5, stock: 40, min: 20 },
  { id: 'p9', sku: 'SNA-001', nombre: 'Papas fritas 150 g', c: 'c4', p: 'pr1', u: 'unidad', pc: 4.0, pv: 6.5, stock: 0, min: 20 },
  { id: 'p10', sku: 'SNA-002', nombre: 'Chocolate con leche 90 g', c: 'c4', p: 'pr1', u: 'unidad', pc: 5.0, pv: 7.5, stock: 14, min: 16 },
];

const categoria = (id) => CATEGORIAS.find((c) => c.id === id) ?? null;
const proveedor = (id) => PROVEEDORES.find((p) => p.id === id) ?? null;
const r2 = (n) => Math.round(n * 100) / 100;

function estadoDe(stock, min) {
  if (stock <= 0) return 'AGOTADO';
  if (stock <= min) return 'BAJO';
  return 'DISPONIBLE';
}

const PRODUCTOS = BASE_PRODUCTOS.map((b) => ({
  id: b.id,
  user_id: USUARIO_ID,
  categoria_id: b.c,
  proveedor_id: b.p,
  nombre: b.nombre,
  sku: b.sku,
  descripcion: null,
  precio_compra: b.pc,
  precio_venta: b.pv,
  stock: b.stock,
  stock_minimo: b.min,
  unidad_medida: b.u,
  imagen_url: null,
  activo: true,
  categoria: categoria(b.c) ? { id: b.c, nombre: categoria(b.c).nombre } : null,
  proveedor: proveedor(b.p) ? { id: b.p, nombre: proveedor(b.p).nombre } : null,
}));

const productoResumen = (id) => {
  const p = PRODUCTOS.find((x) => x.id === id);
  return { id: p.id, nombre: p.nombre, sku: p.sku, unidad_medida: p.unidad_medida };
};

const ALERTAS_ITEMS = PRODUCTOS.filter((p) => estadoDe(p.stock, p.stock_minimo) !== 'DISPONIBLE').map(
  (p) => ({
    id: p.id,
    nombre: p.nombre,
    sku: p.sku,
    unidad_medida: p.unidad_medida,
    stock: p.stock,
    stock_minimo: p.stock_minimo,
    faltante: Math.max(p.stock_minimo - p.stock, 0),
    estado: estadoDe(p.stock, p.stock_minimo),
    categoria: p.categoria,
  }),
);

const ALERTAS = {
  agotados: ALERTAS_ITEMS.filter((a) => a.estado === 'AGOTADO').length,
  bajoStock: ALERTAS_ITEMS.filter((a) => a.estado === 'BAJO').length,
  total: ALERTAS_ITEMS.length,
  items: ALERTAS_ITEMS,
};

const MOVIMIENTOS = [
  { id: 'm1', producto_id: 'p4', tipo: 'ENTRADA', cantidad: 24, ea: 36, ep: 60, motivo: null, descripcion: 'Compra a Alimentos del Valle', fecha: '2026-11-17T09:15:00' },
  { id: 'm2', producto_id: 'p2', tipo: 'SALIDA', cantidad: 6, ea: 18, ep: 12, motivo: 'VENTA', descripcion: 'Venta al público', fecha: '2026-11-17T10:40:00' },
  { id: 'm3', producto_id: 'p9', tipo: 'SALIDA', cantidad: 2, ea: 2, ep: 0, motivo: 'DANADO', descripcion: 'Paquete roto', fecha: '2026-11-16T18:05:00' },
  { id: 'm4', producto_id: 'p5', tipo: 'AJUSTE', cantidad: -3, ea: 25, ep: 22, motivo: 'CONTEO_FISICO', descripcion: 'Conteo físico semanal', fecha: '2026-11-15T20:30:00' },
  { id: 'm5', producto_id: 'p1', tipo: 'ENTRADA', cantidad: 48, ea: 0, ep: 48, motivo: null, descripcion: 'Compra a Distribuidora Andina', fecha: '2026-11-14T08:00:00' },
  { id: 'm6', producto_id: 'p8', tipo: 'SALIDA', cantidad: 10, ea: 50, ep: 40, motivo: 'VENTA', descripcion: 'Venta al público', fecha: '2026-11-13T17:20:00' },
  { id: 'm7', producto_id: 'p3', tipo: 'SALIDA', cantidad: 3, ea: 3, ep: 0, motivo: 'PERDIDO', descripcion: 'Envase vencido', fecha: '2026-11-12T11:10:00' },
  { id: 'm8', producto_id: 'p7', tipo: 'ENTRADA', cantidad: 18, ea: 0, ep: 18, motivo: null, descripcion: 'Compra a Comercial del Sur', fecha: '2026-11-11T09:45:00' },
].map((m) => ({
  id: m.id,
  user_id: USUARIO_ID,
  producto_id: m.producto_id,
  tipo: m.tipo,
  referencia_id: m.id,
  descripcion: m.descripcion,
  cantidad: m.cantidad,
  existencias_anteriores: m.ea,
  existencias_posteriores: m.ep,
  motivo: m.motivo,
  fecha: m.fecha,
  producto: productoResumen(m.producto_id),
}));

const unidadesTotales = PRODUCTOS.reduce((s, p) => s + p.stock, 0);
const valorCompraTotal = r2(PRODUCTOS.reduce((s, p) => s + p.stock * p.precio_compra, 0));
const valorVentaTotal = r2(PRODUCTOS.reduce((s, p) => s + p.stock * p.precio_venta, 0));

const RESUMEN_DASHBOARD = {
  totales: { productos: PRODUCTOS.length, categorias: CATEGORIAS.length, proveedores: PROVEEDORES.length, movimientos: 128 },
  inventario: { unidades: unidadesTotales, valorCompra: valorCompraTotal, valorVenta: valorVentaTotal },
  alertas: ALERTAS,
  flujo: { entradas: 12, salidas: 34, ajustes: 3, unidadesEntrada: 320, unidadesSalida: 186 },
  movimientosRecientes: MOVIMIENTOS.slice(0, 5),
};

const REPORTE_INVENTARIO = {
  items: PRODUCTOS.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    sku: p.sku,
    categoria: p.categoria?.nombre ?? null,
    proveedor: p.proveedor?.nombre ?? null,
    unidad_medida: p.unidad_medida,
    stock: p.stock,
    stock_minimo: p.stock_minimo,
    precio_compra: p.precio_compra,
    precio_venta: p.precio_venta,
    valor_compra: r2(p.stock * p.precio_compra),
    valor_venta: r2(p.stock * p.precio_venta),
    estado: estadoDe(p.stock, p.stock_minimo),
  })),
  totales: {
    productos: PRODUCTOS.length,
    unidades: unidadesTotales,
    valorCompra: valorCompraTotal,
    valorVenta: valorVentaTotal,
    agotados: ALERTAS.agotados,
    bajoStock: ALERTAS.bajoStock,
  },
};

const VENTAS = [
  { id: 'p4', unidades: 120 },
  { id: 'p1', unidades: 96 },
  { id: 'p8', unidades: 60 },
  { id: 'p6', unidades: 48 },
  { id: 'p2', unidades: 42 },
  { id: 'p5', unidades: 30 },
];

const VENTAS_ITEMS = VENTAS.map((v) => {
  const p = PRODUCTOS.find((x) => x.id === v.id);
  const ingreso = r2(v.unidades * p.precio_venta);
  const costo = r2(v.unidades * p.precio_compra);
  const ganancia = r2(ingreso - costo);
  return {
    producto_id: p.id,
    nombre: p.nombre,
    sku: p.sku,
    unidad_medida: p.unidad_medida,
    unidades: v.unidades,
    precio_venta: p.precio_venta,
    precio_compra: p.precio_compra,
    ingreso,
    costo,
    ganancia,
    margen: ingreso > 0 ? r2((ganancia / ingreso) * 100) : 0,
  };
});

const sumar = (items, campo) => r2(items.reduce((s, i) => s + i[campo], 0));
const ingresoTotal = sumar(VENTAS_ITEMS, 'ingreso');
const costoTotal = sumar(VENTAS_ITEMS, 'costo');
const gananciaTotal = r2(ingresoTotal - costoTotal);

const REPORTE_VENTAS = {
  items: VENTAS_ITEMS,
  totales: {
    operaciones: 34,
    unidades: VENTAS_ITEMS.reduce((s, i) => s + i.unidades, 0),
    ingreso: ingresoTotal,
    costo: costoTotal,
    ganancia: gananciaTotal,
    margen: ingresoTotal > 0 ? r2((gananciaTotal / ingresoTotal) * 100) : 0,
  },
};

const MERMAS = [
  { id: 'p9', danado: 2, perdido: 1 },
  { id: 'p3', danado: 0, perdido: 3 },
  { id: 'p2', danado: 1, perdido: 0 },
];

const MERMAS_ITEMS = MERMAS.map((m) => {
  const p = PRODUCTOS.find((x) => x.id === m.id);
  const unidades = m.danado + m.perdido;
  return {
    producto_id: p.id,
    nombre: p.nombre,
    sku: p.sku,
    unidad_medida: p.unidad_medida,
    precio_compra: p.precio_compra,
    unidades,
    unidadesDanado: m.danado,
    unidadesPerdido: m.perdido,
    costo: r2(unidades * p.precio_compra),
  };
});

const REPORTE_MERMAS = {
  items: MERMAS_ITEMS,
  totales: {
    operaciones: MERMAS_ITEMS.length,
    unidades: MERMAS_ITEMS.reduce((s, i) => s + i.unidades, 0),
    costo: sumar(MERMAS_ITEMS, 'costo'),
    unidadesDanado: MERMAS_ITEMS.reduce((s, i) => s + i.unidadesDanado, 0),
    unidadesPerdido: MERMAS_ITEMS.reduce((s, i) => s + i.unidadesPerdido, 0),
    costoDanado: r2(MERMAS_ITEMS.reduce((s, i) => s + i.unidadesDanado * i.precio_compra, 0)),
    costoPerdido: r2(MERMAS_ITEMS.reduce((s, i) => s + i.unidadesPerdido * i.precio_compra, 0)),
  },
};

const ROTACION = [
  { id: 'p4', unidades: 120, ultima: '2026-11-17T10:40:00' },
  { id: 'p1', unidades: 96, ultima: '2026-11-17T09:05:00' },
  { id: 'p8', unidades: 60, ultima: '2026-11-16T19:15:00' },
  { id: 'p6', unidades: 48, ultima: '2026-11-16T12:30:00' },
  { id: 'p2', unidades: 42, ultima: '2026-11-17T10:40:00' },
  { id: 'p5', unidades: 30, ultima: '2026-11-15T18:00:00' },
  { id: 'p7', unidades: 12, ultima: '2026-11-14T16:45:00' },
  { id: 'p10', unidades: 0, ultima: null },
  { id: 'p9', unidades: 0, ultima: null },
  { id: 'p3', unidades: 0, ultima: null },
];

const ROTACION_ITEMS = ROTACION.map((r) => {
  const p = PRODUCTOS.find((x) => x.id === r.id);
  return {
    producto_id: p.id,
    nombre: p.nombre,
    sku: p.sku,
    unidad_medida: p.unidad_medida,
    categoria: p.categoria?.nombre ?? null,
    stock: p.stock,
    unidadesVendidas: r.unidades,
    ingreso: r2(r.unidades * p.precio_venta),
    ultimaVenta: r.ultima,
    sinMovimiento: r.unidades === 0,
  };
});

const REPORTE_ROTACION = {
  items: ROTACION_ITEMS,
  totales: {
    productos: ROTACION_ITEMS.length,
    conMovimiento: ROTACION_ITEMS.filter((i) => !i.sinMovimiento).length,
    sinMovimiento: ROTACION_ITEMS.filter((i) => i.sinMovimiento).length,
    unidades: ROTACION_ITEMS.reduce((s, i) => s + i.unidadesVendidas, 0),
    ingreso: sumar(ROTACION_ITEMS, 'ingreso'),
  },
};

const ok = (data) => ({ success: true, data });
const paginado = (items) => ({ success: true, data: { items, total: items.length, page: 1, limit: 100 } });

// Devuelve el cuerpo JSON que corresponde a una llamada a la API.
export function responderApi(url) {
  const ruta = url.split('/api/')[1]?.split('?')[0] ?? '';
  const [recurso, sub] = ruta.split('/');

  switch (recurso) {
    case 'alertas':
      return ok(ALERTAS);
    case 'dashboard':
      return ok(RESUMEN_DASHBOARD);
    case 'productos':
      return paginado(PRODUCTOS);
    case 'categorias':
      return paginado(CATEGORIAS);
    case 'proveedores':
      return paginado(PROVEEDORES);
    case 'movimientos':
      return paginado(MOVIMIENTOS);
    case 'entradas':
    case 'salidas':
    case 'ajustes':
      return paginado([]);
    case 'auth':
      return ok(USUARIO);
    case 'reportes':
      if (sub === 'inventario') return ok(REPORTE_INVENTARIO);
      if (sub === 'ventas') return ok(REPORTE_VENTAS);
      if (sub === 'mermas') return ok(REPORTE_MERMAS);
      if (sub === 'rotacion') return ok(REPORTE_ROTACION);
      return ok(REPORTE_INVENTARIO);
    default:
      return paginado([]);
  }
}

export const SESION = { usuario: USUARIO };
