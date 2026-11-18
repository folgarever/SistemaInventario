# Sistema de Inventario

![CI](https://github.com/folgarever/SistemaInventario/actions/workflows/ci.yml/badge.svg)

Aplicación web para administrar y controlar el inventario de una tienda: productos,
categorías, proveedores, entradas, salidas, ajustes, movimientos, alertas de stock,
reportes y dashboard.

- **Frontend:** Angular 22 + TypeScript (standalone components, signals).
- **Backend:** Node.js + Express + TypeScript (API REST).
- **Base de datos:** Supabase (PostgreSQL administrado en la nube).
- **Despliegue:** Vercel (frontend estático + backend como función serverless en `/api`).

## Estructura del proyecto

```
SistemaInventario/
├── api/index.ts            # Entrada serverless de Vercel -> backend/src/app
├── vercel.json             # Build del frontend, rewrites y cabeceras de seguridad
├── supabase/schema.sql     # Tablas, restricciones, índices y funciones RPC
├── backend/                # API REST (Express + TypeScript)
│   ├── src/config          # Variables de entorno y cliente de Supabase
│   ├── src/controllers     # Controladores por módulo
│   ├── src/services        # Lógica de negocio y acceso a datos
│   ├── src/routes          # Definición de rutas por módulo
│   ├── src/middlewares     # Autenticación, errores, seguridad, rate limit
│   ├── src/types           # Tipos compartidos de la API
│   ├── src/utils           # Utilidades (saneamiento, paginación, errores)
│   ├── src/app.ts          # Configuración de Express
│   └── src/server.ts       # Arranque local
└── frontend/               # Aplicación Angular
    └── src/app
        ├── core            # Servicios, guards, interceptores, utilidades
        ├── models          # Interfaces y modelos
        ├── services        # Clientes HTTP por módulo
        ├── components      # Componentes reutilizables (navbar, footer, toast)
        └── pages           # Páginas por módulo
```

## Módulos

| Módulo | Descripción |
| --- | --- |
| Autenticación | Registro, inicio de sesión, recuperación y restablecimiento de contraseña, perfil y eliminación de cuenta. |
| Categorías | Catálogo de categorías con activación/desactivación y borrado seguro. |
| Proveedores | Catálogo de proveedores con activación/desactivación y borrado seguro. |
| Productos | Catálogo de productos (SKU, precios, stock mínimo, unidad de medida). El stock solo cambia por movimientos. |
| Entradas | Registro multi-producto de compras con proveedor, totales e historial. |
| Salidas | Registro de salidas con motivo (venta, dañado, perdido, uso interno, etc.). |
| Ajustes | Correcciones de inventario por conteo físico, error de registro, merma o devolución. |
| Movimientos | Registra compras, ventas (carrito multi-producto), ajustes y devoluciones, y muestra el kardex de solo lectura (entradas, salidas y ajustes con existencias antes/después). |
| Alertas | Productos agotados o por debajo del stock mínimo. |
| Avisos | Notificaciones locales de stock bajo: avisa cuando un producto se agota o baja del mínimo mientras la app está abierta (se activa desde el perfil). |
| Dashboard | Totales, valor del inventario, alertas y movimientos recientes. |
| Reportes | Inventario valorizado, movimientos, ventas y ganancia por rango, lista de reposición, mermas y rotación. Exportación a PDF con gráficos. |

## Aplicación instalable (PWA)

El frontend incluye un *manifest* y un *service worker* (`@angular/service-worker`), por lo
que se puede **instalar en el móvil** (Añadir a pantalla de inicio) y abrir sin conexión el
último contenido visitado. La caché se actualiza sola al publicar una versión nueva.

- `frontend/public/manifest.webmanifest` — nombre, colores e iconos (192/512, incluidos los
  *maskable* para Android).
- `frontend/ngsw-config.json` — grupos de caché: *app shell* (precarga), imágenes de marca
  (bajo demanda) y tipografía de Google Fonts.
- El service worker se registra **solo en producción** (no en `ng serve`).

### Avisos de stock bajo

Desde **Perfil → Avisos de stock bajo** se pueden activar las notificaciones del navegador. Al
activarlas, la app pide permiso y luego avisa (con el *service worker*) cuando un producto se
agota o baja del stock mínimo. Revisa las alertas cada 5 minutos y no repite el mismo aviso:
solo notifica los productos nuevos o que cambian de estado. Funciona **mientras la app esté
abierta** y no requiere configuración adicional en el servidor.

## API REST

Todos los endpoints (excepto el registro e inicio de sesión) requieren el encabezado
`Authorization: Bearer <token>`. La API responde con `{ success, data }` o
`{ success: false, message }`.

| Recurso | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `POST /api/auth/logout`, `GET /api/auth/profile`, `PUT /api/auth/profile`, `PUT /api/auth/password`, `DELETE /api/auth/account` |
| Categorías | `GET/POST /api/categorias`, `GET/PUT/DELETE /api/categorias/:id`, `PATCH /api/categorias/:id/estado` |
| Proveedores | `GET/POST /api/proveedores`, `GET/PUT/DELETE /api/proveedores/:id`, `PATCH /api/proveedores/:id/estado` |
| Productos | `GET/POST /api/productos`, `GET/PUT/DELETE /api/productos/:id`, `PATCH /api/productos/:id/estado` |
| Entradas | `GET/POST /api/entradas`, `GET /api/entradas/:id` |
| Salidas | `GET/POST /api/salidas`, `GET /api/salidas/:id` |
| Ajustes | `GET/POST /api/ajustes`, `GET /api/ajustes/:id` |
| Movimientos | `GET /api/movimientos` |
| Dashboard | `GET /api/dashboard/resumen` |
| Alertas | `GET /api/alertas` |
| Reportes | `GET /api/reportes/inventario`, `GET /api/reportes/movimientos`, `GET /api/reportes/ventas`, `GET /api/reportes/mermas`, `GET /api/reportes/rotacion` |

## Requisitos

- Node.js 20+ (probado con 24).
- Cuenta de Supabase (base de datos remota).
- Cuenta de Vercel (despliegue).
- Cuenta de Resend (envío de correos de recuperación de contraseña).

> No es necesario instalar MySQL ni PostgreSQL localmente: la base de datos vive en Supabase.

## Configuración local

1. Instalar dependencias:

   ```bash
   npm run install:all
   ```

2. Crear el archivo `.env` en la raíz (copiar de `.env.example`) y completar:

   ```
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   JWT_SECRET=...
   JWT_EXPIRES_IN=7d
   CORS_ORIGINS=http://localhost:4200
   RESEND_API_KEY=...
   EMAIL_FROM=...
   FRONTEND_URL=http://localhost:4200
   ```

3. Ejecutar el esquema en Supabase: abrir **SQL Editor** y pegar el contenido de
   `supabase/schema.sql`.

4. Levantar backend y frontend:

   ```bash
   cd backend && npm run dev     # API en http://localhost:3000
   cd frontend && npm start      # App en http://localhost:4200
   ```

## Pruebas

- **Esquema de base de datos:** validado contra un PostgreSQL temporal; cubre la
  creación de tablas y RPC, entradas multi-producto, idempotencia, salidas con stock
  insuficiente, motivos inválidos, ajustes y la inmutabilidad de los movimientos.
- **Backend (unitarias):** utilidades, middlewares y validaciones del servicio de
  autenticación con el runner de pruebas de Node (no requiere base de datos).

  ```bash
  cd backend && npm test
  ```

- **Frontend (unitarias):**

  ```bash
  cd frontend && npm test
  ```

- **Compilación:** `cd backend && npm run build` y `cd frontend && npm run build`.

- **Integración continua:** el flujo de GitHub Actions en `.github/workflows/ci.yml`
  compila y ejecuta las pruebas del backend y del frontend en cada push a `main` o
  `folgarever` y en cada pull request hacia `main`.

## Despliegue en Vercel

1. Importar el repositorio en Vercel (framework: **Other**).
2. Definir las variables de entorno en **Project → Settings → Environment Variables**:
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGINS`,
   `RESEND_API_KEY`, `EMAIL_FROM`, `FRONTEND_URL`.
3. Desplegar. Vercel compila el frontend y publica la API como función serverless
   en `/api/*` (misma URL, sin problemas de CORS).

## Seguridad

- La `SUPABASE_SERVICE_ROLE_KEY` solo se usa en el backend; nunca se expone al navegador.
- Autenticación por JWT; contraseñas con hash bcrypt.
- Cálculos de existencias validados en la base de datos mediante funciones
  transaccionales (RPC) con bloqueo `FOR UPDATE` (evita existencias negativas por concurrencia).
- Los movimientos de inventario son inmutables; las correcciones se registran como ajustes.
  (El borrado de una cuenta es la única excepción y ocurre dentro de una función de base de datos.)
- Idempotencia en entradas, salidas y ajustes mediante `client_request_id`.
- La eliminación de cuenta exige confirmar la contraseña actual.

## Estado del proyecto

Desarrollo por etapas. Cada etapa termina con pruebas y un commit en la rama `folgarever`.
