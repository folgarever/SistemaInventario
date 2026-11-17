import { beforeEach, describe, expect, it, vi } from 'vitest';

const pdf = vi.hoisted(() => ({
  rect: vi.fn(),
  text: vi.fn(),
  save: vi.fn(),
  addPage: vi.fn(),
}));

vi.mock('jspdf', () => {
  class FakePdf {
    internal = { pageSize: { getWidth: () => 842, getHeight: () => 595 } };
    setFillColor = vi.fn();
    setDrawColor = vi.fn();
    setTextColor = vi.fn();
    setFont = vi.fn();
    setFontSize = vi.fn();
    getTextWidth = (texto: string) => texto.length * 4;
    rect = pdf.rect;
    roundedRect = vi.fn();
    text = pdf.text;
    addPage = pdf.addPage;
    setPage = vi.fn();
    getNumberOfPages = () => 1;
    save = pdf.save;
  }
  return { jsPDF: FakePdf };
});

vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));

import { fechaArchivo, fechaHoraArchivo, generarPdf } from './pdf.utils';

describe('fechaArchivo', () => {
  it('devuelve la fecha en formato aaaa-mm-dd', () => {
    expect(fechaArchivo()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('fechaHoraArchivo', () => {
  it('devuelve la fecha y hora en formato dd/mm/aaaa hh:mm', () => {
    expect(fechaHoraArchivo()).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });
});

describe('generarPdf con gráficos', () => {
  beforeEach(() => {
    pdf.rect.mockClear();
    pdf.text.mockClear();
    pdf.save.mockClear();
    pdf.addPage.mockClear();
  });

  it('dibuja las barras y el valor de cada dato', async () => {
    await generarPdf({
      titulo: 'Reporte',
      graficos: [
        {
          titulo: 'Top productos',
          datos: [
            { etiqueta: 'Café', valor: 100 },
            { etiqueta: 'Té', valor: 50 },
          ],
          formatoValor: (v) => `$${v}`,
        },
      ],
      secciones: [],
      nombreArchivo: 'reporte.pdf',
    });

    // 1 rectángulo del encabezado + 2 barras (pista de fondo + relleno).
    expect(pdf.rect).toHaveBeenCalledTimes(5);
    expect(pdf.text).toHaveBeenCalledWith('Top productos', expect.any(Number), expect.any(Number));
    expect(pdf.text).toHaveBeenCalledWith('$100', expect.any(Number), expect.any(Number));
    expect(pdf.save).toHaveBeenCalledWith('reporte.pdf');
  });

  it('omite el gráfico cuando no hay datos', async () => {
    await generarPdf({
      titulo: 'Reporte',
      graficos: [{ titulo: 'Vacío', datos: [] }],
      secciones: [],
      nombreArchivo: 'reporte.pdf',
    });

    // Solo se dibuja el rectángulo del encabezado, ninguna barra.
    expect(pdf.rect).toHaveBeenCalledTimes(1);
    expect(pdf.save).toHaveBeenCalledWith('reporte.pdf');
  });
});
