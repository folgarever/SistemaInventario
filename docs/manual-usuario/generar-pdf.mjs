// Genera docs/Manual-Usuario.pdf a partir de manual.html usando Chrome en modo
// headless por el protocolo DevTools. Asi el pie de pagina lleva numeros reales.
//
// Uso:  node docs/manual-usuario/generar-pdf.mjs
// Requiere Google Chrome (o Edge) instalado. Se puede indicar la ruta con la
// variable de entorno CHROME_PATH.
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const HTML = join(AQUI, 'manual.html');
// El PDF vive en los assets del frontend para poder descargarlo desde la app.
const OUT = resolve(AQUI, '..', '..', 'frontend', 'public', 'manual', 'Manual-Usuario.pdf');
const PERFIL = join(tmpdir(), 'manual-usuario-chrome');
const PUERTO = 9333;

function buscarNavegador() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const candidatos = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  const encontrado = candidatos.find((p) => existsSync(p));
  if (!encontrado) {
    throw new Error('No se encontro Chrome ni Edge. Define CHROME_PATH.');
  }
  return encontrado;
}

async function esperarDevtools() {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${PUERTO}/json/version`)).ok) return;
    } catch {
      // todavia no levanta
    }
    await sleep(200);
  }
  throw new Error('DevTools no respondio');
}

const navegador = spawn(
  buscarNavegador(),
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${PERFIL}`,
    `--remote-debugging-port=${PUERTO}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

try {
  await esperarDevtools();

  const lista = await (await fetch(`http://127.0.0.1:${PUERTO}/json/list`)).json();
  const pagina = lista.find((t) => t.type === 'page');
  if (!pagina) throw new Error('Sin target de pagina');

  const ws = new WebSocket(pagina.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', rej);
  });

  let id = 0;
  const pendientes = new Map();
  const eventos = [];

  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data));
    if (msg.id && pendientes.has(msg.id)) {
      const { res, rej } = pendientes.get(msg.id);
      pendientes.delete(msg.id);
      if (msg.error) rej(new Error(JSON.stringify(msg.error)));
      else res(msg.result);
    } else if (msg.method) {
      eventos.push(msg);
    }
  });

  const send = (method, params = {}) => {
    const mid = ++id;
    ws.send(JSON.stringify({ id: mid, method, params }));
    return new Promise((res, rej) => pendientes.set(mid, { res, rej }));
  };

  await send('Page.enable');
  await send('Page.navigate', { url: pathToFileURL(HTML).href });

  const t0 = Date.now();
  while (!eventos.some((e) => e.method === 'Page.loadEventFired') && Date.now() - t0 < 20000) {
    await sleep(150);
  }
  await sleep(800);

  const pie =
    '<div style="width:100%;font-family:Arial,sans-serif;font-size:7pt;color:#8a8a8a;' +
    'padding:2mm 14mm 0 14mm;border-top:1px solid #dcdcdc;display:flex;' +
    'justify-content:space-between;margin:0;">' +
    '<span>Sistema de Inventario &middot; Manual de usuario</span>' +
    '<span>Pagina <span class="pageNumber"></span> de <span class="totalPages"></span></span>' +
    '</div>';

  const resultado = await send('Page.printToPDF', {
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: pie,
    paperWidth: 8.27,
    paperHeight: 11.69,
    marginTop: 0.63,
    marginBottom: 0.85,
    marginLeft: 0.63,
    marginRight: 0.63,
    preferCSSPageSize: false,
  });

  const { writeFileSync } = await import('node:fs');
  writeFileSync(OUT, Buffer.from(resultado.data, 'base64'));
  console.log('PDF generado: ' + OUT);
  ws.close();
} finally {
  navegador.kill();
}
