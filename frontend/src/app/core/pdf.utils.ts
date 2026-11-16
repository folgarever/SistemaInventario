// Utilidad para generar documentos PDF en el navegador.
// Las librerias (jspdf y jspdf-autotable) se cargan de forma diferida: solo se
// descargan cuando el usuario exporta un documento, de modo que no aumentan el
// peso de la carga inicial de la aplicacion.
//
// El estilo sigue la identidad visual del sistema: monocromatico (negro, blanco
// y grises), encabezado negro y tablas con cabecera negra.

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

export interface DocumentoPdf {
  titulo: string;
  subtitulo?: string;
  // Lineas de metadatos bajo el subtitulo (por ejemplo, el rango de fechas).
  meta?: string[];
  // Tarjetas de totales mostradas antes de las tablas.
  resumen?: ResumenPdf[];
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
