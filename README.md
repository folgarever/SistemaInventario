# Sistema de Inventario

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
│   ├── src/middlewares     # Autenticación, errores, seguridad, rate limit
│   ├── src/utils           # Utilidades (saneamiento, paginación)
│   ├── src/app.ts          # Configuración de Express
│   └── src/server.ts       # Arranque local
└── frontend/               # Aplicación Angular
    └── src/app
        ├── core            # Servicios, guards, interceptores, utilidades
        ├── models          # Interfaces y modelos
        ├── services        # Clientes HTTP por módulo
        ├── components      # Componentes reutilizables (navbar, footer)
        └── pages           # Páginas por módulo
```

## Requisitos

- Node.js 20+ (probado con 24).
- Cuenta de Supabase (base de datos remota).
- Cuenta de Vercel (despliegue).

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
   ```

3. Ejecutar el esquema en Supabase: abrir **SQL Editor** y pegar el contenido de
   `supabase/schema.sql`.

4. Levantar backend y frontend:

   ```bash
   cd backend && npm run dev     # API en http://localhost:3000
   cd frontend && npm start      # App en http://localhost:4200
   ```

## Despliegue en Vercel

1. Importar el repositorio en Vercel (framework: **Other**).
2. Definir las variables de entorno en **Project → Settings → Environment Variables**:
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGINS`.
3. Desplegar. Vercel compila el frontend y publica la API como función serverless
   en `/api/*` (misma URL, sin problemas de CORS).

## Seguridad

- La `SUPABASE_SERVICE_ROLE_KEY` solo se usa en el backend; nunca se expone al navegador.
- Autenticación por JWT; contraseñas con hash bcrypt.
- Cálculos de existencias validados en la base de datos mediante funciones
  transaccionales (RPC) con bloqueo `FOR UPDATE` (evita existencias negativas por concurrencia).
- Los movimientos de inventario son inmutables; las correcciones se registran como ajustes.

## Estado del proyecto

Desarrollo por etapas. Cada etapa termina con pruebas y un commit en la rama `folgarever`.
