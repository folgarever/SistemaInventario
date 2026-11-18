// Toma las capturas de pantalla del manual. Levanta la app ya compilada
// (frontend/dist/frontend/browser), intercepta las llamadas a /api/** y las
// responde con datos de demostracion (datos-demo.mjs). No toca Supabase.
//
// Uso:
//   npm --prefix frontend run build
//   node docs/manual-usuario/capturas.mjs
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { responderApi, SESION } from './datos-demo.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const APP = resolve(AQUI, '..', '..', 'frontend', 'dist', 'frontend', 'browser');
const SALIDA = join(AQUI, 'capturas');
const PUERTO_WEB = 4321;
const PUERTO_CDP = 9335;
const ANCHO = 1440;
const ALTO = 900;

if (!existsSync(join(APP, 'index.html'))) {
  console.error('Falta la app compilada en ' + APP + '. Ejecuta: npm --prefix frontend run build');
  process.exit(1);
}

function buscarNavegador() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
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
  if (!encontrado) throw new Error('No se encontro Chrome ni Edge. Define CHROME_PATH.');
  return encontrado;
}

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
};

function crearServidor() {
  return createServer(async (req, res) => {
    const ruta = decodeURIComponent((req.url ?? '/').split('?')[0]);
    // El service worker no interesa para las capturas.
    if (ruta === '/ngsw-worker.js' || ruta === '/ngsw.json' || ruta === '/safety-worker.js') {
      res.writeHead(404);
      res.end();
      return;
    }
    let archivo = normalize(join(APP, ruta));
    if (!archivo.startsWith(APP + sep) || !extname(archivo)) {
      archivo = join(APP, 'index.html');
    }
    try {
      const contenido = await readFile(archivo);
      res.writeHead(200, { 'Content-Type': TIPOS[extname(archivo)] ?? 'application/octet-stream' });
      res.end(contenido);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
}

function scriptSesion(conSesion) {
  const token = 'sistema_inventario_token';
  const user = 'sistema_inventario_user';
  const tema = 'sistema_inventario_tema';
  if (conSesion) {
    return (
      'try{localStorage.setItem("' + token + '","captura-demo");' +
      'localStorage.setItem("' + user + '",' + JSON.stringify(JSON.stringify(SESION.usuario)) + ');' +
      'localStorage.setItem("' + tema + '","light");}catch(e){}'
    );
  }
  return (
    'try{localStorage.removeItem("' + token + '");localStorage.removeItem("' + user + '");' +
    'localStorage.setItem("' + tema + '","light");}catch(e){}'
  );
}

mkdirSync(SALIDA, { recursive: true });

const servidor = crearServidor();
await new Promise((res) => servidor.listen(PUERTO_WEB, '127.0.0.1', res));

const navegador = spawn(
  buscarNavegador(),
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    `--window-size=${ANCHO},${ALTO}`,
    `--user-data-dir=${join(resolve(AQUI, '..', '..'), 'node_modules', '.cache', 'capturas-chrome')}`,
    `--remote-debugging-port=${PUERTO_CDP}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${PUERTO_CDP}/json/version`)).ok) break;
    } catch {
      // todavia no levanta
    }
    await sleep(200);
  }

  const lista = await (await fetch(`http://127.0.0.1:${PUERTO_CDP}/json/list`)).json();
  const pagina = lista.find((t) => t.type === 'page');
  const ws = new WebSocket(pagina.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', rej);
  });

  let id = 0;
  const pendientes = new Map();
  const eventos = [];

  const send = (method, params = {}) => {
    const mid = ++id;
    ws.send(JSON.stringify({ id: mid, method, params }));
    return new Promise((res, rej) => pendientes.set(mid, { res, rej }));
  };

  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data));
    if (msg.id && pendientes.has(msg.id)) {
      const { res, rej } = pendientes.get(msg.id);
      pendientes.delete(msg.id);
      if (msg.error) rej(new Error(JSON.stringify(msg.error)));
      else res(msg.result);
      return;
    }
    if (msg.method === 'Fetch.requestPaused') {
      const { requestId, request } = msg.params;
      const cuerpo = responderApi(request.url);
      send('Fetch.fulfillRequest', {
        requestId,
        responseCode: 200,
        responseHeaders: [{ name: 'Content-Type', value: 'application/json; charset=utf-8' }],
        body: Buffer.from(JSON.stringify(cuerpo)).toString('base64'),
      }).catch(() => {});
      return;
    }
    if (msg.method) eventos.push(msg);
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: ANCHO,
    height: ALTO,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Fetch.enable', { patterns: [{ urlPattern: '*/api/*', requestStage: 'Request' }] });

  async function esperarCarga() {
    eventos.length = 0;
    const t0 = Date.now();
    while (!eventos.some((e) => e.method === 'Page.loadEventFired') && Date.now() - t0 < 20000) {
      await sleep(120);
    }
    await sleep(1300);
  }

  async function capturar(conSesion, rutas) {
    const { identifier } = await send('Page.addScriptToEvaluateOnNewDocument', {
      source: scriptSesion(conSesion),
    });
    for (const [ruta, nombre] of rutas) {
      await send('Page.navigate', { url: `http://127.0.0.1:${PUERTO_WEB}${ruta}` });
      await esperarCarga();
      const shot = await send('Page.captureScreenshot', {
        format: 'png',
        clip: { x: 0, y: 0, width: ANCHO, height: ALTO, scale: 1 },
      });
      writeFileSync(join(SALIDA, nombre), Buffer.from(shot.data, 'base64'));
      const texto = await send('Runtime.evaluate', {
        expression: 'document.body.innerText.replace(/\\s+/g," ").trim().slice(0,140)',
        returnByValue: true,
      });
      console.log('  ' + nombre + ' -> ' + texto.result.value);
    }
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
  }

  console.log('Capturas con sesion:');
  await capturar(true, [
    ['/dashboard', 'panel.png'],
    ['/productos', 'productos.png'],
    ['/movimientos', 'movimientos.png'],
    ['/conteo', 'conteo.png'],
    ['/compras', 'compras.png'],
    ['/reportes', 'reportes.png'],
    ['/perfil', 'perfil.png'],
  ]);

  console.log('Capturas publicas:');
  await capturar(false, [
    ['/login', 'login.png'],
    ['/registro', 'registro.png'],
  ]);

  ws.close();
} finally {
  navegador.kill();
  servidor.close();
}
