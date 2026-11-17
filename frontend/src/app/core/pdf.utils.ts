// Utilidad para generar documentos PDF en el navegador.
// Las librerias (jspdf y jspdf-autotable) se cargan de forma diferida: solo se
// descargan cuando el usuario exporta un documento, de modo que no aumentan el
// peso de la carga inicial de la aplicacion.
//
// El estilo sigue la identidad visual del sistema: monocromatico (negro, blanco
// y grises), encabezado negro y tablas con cabecera negra.

import type { jsPDF } from 'jspdf';

export interface ColumnaPdf {
  encabezado: string;
  clave: string;
  alineacion?: 'left' | 'right' | 'center';
}

export type FilaPdf = Record<string, string | number | null | undefined>;

export interface SeccionPdf {
  titulo?: string;
  columnas: ColumnaPdf[];
  filas: FilaPdf[];
}

export interface ResumenPdf {
  etiqueta: string;
  valor: string;
}

export interface DatoGraficoPdf {
  etiqueta: string;
  valor: number;
}

// Grafico de barras horizontales dibujado con primitivas de jsPDF (sin SVG ni
// imagenes). Se usa para acompanar los reportes con una lectura visual rapida.
export interface GraficoBarrasPdf {
  titulo?: string;
  datos: DatoGraficoPdf[];
  // Texto con el que se muestra el valor de cada barra (por defecto, el numero).
  formatoValor?: (valor: number) => string;
}

export interface DocumentoPdf {
  titulo: string;
  subtitulo?: string;
  // Lineas de metadatos bajo el subtitulo (por ejemplo, el rango de fechas).
  meta?: string[];
  // Tarjetas de totales mostradas antes de las tablas.
  resumen?: ResumenPdf[];
  // Graficos mostrados despues del resumen y antes de las tablas.
  graficos?: GraficoBarrasPdf[];
  secciones: SeccionPdf[];
  nombreArchivo: string;
  horizontal?: boolean;
}

function texto(valor: string | number | null | undefined): string {
  return valor === null || valor === undefined ? '' : String(valor);
}

// Devuelve la fecha actual en formato aaaa-mm-dd (para nombrar los archivos).
export function fechaArchivo(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

// Devuelve la fecha y hora actuales en formato dd/mm/aaaa hh:mm (pie de pagina).
export function fechaHoraArchivo(): string {
  const ahora = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(ahora.getDate())}/${p(ahora.getMonth() + 1)}/${ahora.getFullYear()} ${p(
    ahora.getHours(),
  )}:${p(ahora.getMinutes())}`;
}

// Recorta un texto con puntos suspensivos si supera el ancho disponible.
function recortarTexto(pdf: jsPDF, texto: string, anchoMax: number): string {
  if (pdf.getTextWidth(texto) <= anchoMax) return texto;
  let recortado = texto;
  while (recortado.length > 1 && pdf.getTextWidth(recortado + '...') > anchoMax) {
    recortado = recortado.slice(0, -1);
  }
  return recortado + '...';
}

// Dibuja un grafico de barras horizontales y devuelve la coordenada vertical
// donde continuar el documento. Respeta el limite inferior de la pagina.
function dibujarGraficoBarras(
  pdf: jsPDF,
  grafico: GraficoBarrasPdf,
  x: number,
  ancho: number,
  yInicial: number,
  limiteInferior: number,
): number {
  let y = yInicial;
  const fuente = 'helvetica';

  if (grafico.titulo) {
    pdf.setTextColor(0, 0, 0);
    pdf.setFont(fuente, 'bold');
    pdf.setFontSize(11);
    pdf.text(grafico.titulo, x, y);
    y += 18;
  }

  const datos = grafico.datos.filter((d) => Number.isFinite(d.valor));
  if (datos.length === 0) {
    return y;
  }

  const maximo = Math.max(...datos.map((d) => Math.abs(d.valor)), 0);
  const anchoEtiqueta = Math.min(ancho * 0.42, 200);
  const anchoValor = 80;
  const separacion = 8;
  const barX = x + anchoEtiqueta + separacion;
  const anchoBarra = Math.max(ancho - anchoEtiqueta - separacion - anchoValor, 40);
  const altoFila = 18;
  const altoBarra = 9;
  const formato = grafico.formatoValor ?? ((v: number) => String(v));

  for (const dato of datos) {
    if (y + altoFila > limiteInferior) {
      pdf.addPage();
      y = 56;
    }

    // Etiqueta de la barra.
    pdf.setTextColor(51, 51, 51);
    pdf.setFont(fuente, 'normal');
    pdf.setFontSize(8);
    pdf.text(recortarTexto(pdf, dato.etiqueta, anchoEtiqueta), x, y + altoBarra - 1.5);

    // Pista de fondo de la barra.
    pdf.setFillColor(240, 240, 240);
    pdf.rect(barX, y, anchoBarra, altoBarra, 'F');

    // Relleno proporcional al valor.
    const fraccion = maximo > 0 ? Math.abs(dato.valor) / maximo : 0;
    if (fraccion > 0) {
      pdf.setFillColor(0, 0, 0);
      pdf.rect(barX, y, Math.max(anchoBarra * fraccion, 2), altoBarra, 'F');
    }

    // Valor a la derecha de la barra.
    pdf.setTextColor(0, 0, 0);
    pdf.setFont(fuente, 'bold');
    pdf.setFontSize(8);
    pdf.text(formato(dato.valor), barX + anchoBarra + 6, y + altoBarra - 1.5);

    y += altoFila;
  }

  return y + 8;
}

// Genera y descarga un PDF con encabezado, metadatos, tarjetas de totales y una
// o varias tablas. Devuelve una promesa que se resuelve al terminar la descarga.
export async function generarPdf(documento: DocumentoPdf): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const pdf = new jsPDF({
    orientation: documento.horizontal ? 'landscape' : 'portrait',
    unit: 'pt',
    format: 'a4',
    compress: true,
  });

  const anchoPagina = pdf.internal.pageSize.getWidth();
  const altoPagina = pdf.internal.pageSize.getHeight();
  const margen = 40;
  const anchoUtil = anchoPagina - margen * 2;

  // Encabezado negro con el nombre del sistema y el titulo del documento.
  pdf.setFillColor(0, 0, 0);
  pdf.rect(0, 0, anchoPagina, 72, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('SISTEMA DE INVENTARIO', margen, 28);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(documento.titulo, margen, 52);

  let y = 96;

  if (documento.subtitulo) {
    pdf.setTextColor(94, 94, 94);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(documento.subtitulo, margen, y);
    y += 16;
  }

  if (documento.meta?.length) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(94, 94, 94);
    for (const linea of documento.meta) {
      pdf.text(linea, margen, y);
      y += 13;
    }
    y += 4;
  }

  if (documento.resumen?.length) {
    const separacion = 10;
    const anchoCaja =
      (anchoUtil - separacion * (documento.resumen.length - 1)) / documento.resumen.length;
    const altoCaja = 48;
    documento.resumen.forEach((r, i) => {
      const x = margen + i * (anchoCaja + separacion);
      pdf.setDrawColor(229, 229, 229);
      pdf.setFillColor(250, 250, 250);
      pdf.roundedRect(x, y, anchoCaja, altoCaja, 6, 6, 'FD');
      pdf.setTextColor(94, 94, 94);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.text(r.etiqueta.toUpperCase(), x + 10, y + 18);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.text(r.valor, x + 10, y + 37);
    });
    y += altoCaja + 20;
  }

  for (const grafico of documento.graficos ?? []) {
    y = dibujarGraficoBarras(pdf, grafico, margen, anchoUtil, y, altoPagina - margen - 20);
    y += 10;
  }

  for (const seccion of documento.secciones) {
    if (seccion.titulo) {
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text(seccion.titulo, margen, y);
      y += 12;
    }

    const columnas = seccion.columnas;
    autoTable(pdf, {
      startY: y,
      margin: { left: margen, right: margen },
      head: [columnas.map((c) => c.encabezado)],
      body: seccion.filas.map((fila) => columnas.map((c) => texto(fila[c.clave]))),
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 5,
        textColor: [51, 51, 51],
        lineColor: [229, 229, 229],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [0, 0, 0],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: Object.fromEntries(
        columnas.map((c, i) => [i, { halign: c.alineacion ?? 'left' }]),
      ),
    });

    const finalY = (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
    y = (finalY ?? y) + 24;
  }

  const totalPaginas = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    pdf.setPage(i);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(175, 175, 175);
    pdf.text(`Generado el ${fechaHoraArchivo()}`, margen, altoPagina - 20);
    pdf.text(`Pagina ${i} de ${totalPaginas}`, anchoPagina - margen, altoPagina - 20, {
      align: 'right',
    });
  }

  pdf.save(documento.nombreArchivo);
}
