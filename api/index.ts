import { app } from '../backend/src/app';

// Punto de entrada de la funcion serverless de Vercel.
// Vercel enruta todas las peticiones "/api/*" a este handler (ver vercel.json),
// conservando la URL original para que Express resuelva las rutas internas.
export default app;
