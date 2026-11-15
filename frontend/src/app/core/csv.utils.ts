// Utilidad para exportar datos a CSV y descargarlos en el navegador.
// Se usa el punto y coma como separador y se antepone un BOM para que Excel
// reconozca el archivo como UTF-8 (tildes y enes correctas).

type CeldaCsv = string | number | null | undefined;

function celda(valor: CeldaCsv): string {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  if (/[";\r\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

export function construirCsv(filas: CeldaCsv[][]): string {
  return filas.map((fila) => fila.map(celda).join(';')).join('\r\n');
}

export function descargarCsv(nombreArchivo: string, filas: CeldaCsv[][]): void {
  const contenido = '\uFEFF' + construirCsv(filas);
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

// Devuelve la fecha actual en formato aaaa-mm-dd (para nombrar los archivos).
export function fechaArchivo(): string {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}
