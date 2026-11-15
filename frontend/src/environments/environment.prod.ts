declare global {
  interface Window {
    API_URL?: string;
    SISTEMA_INVENTARIO_API_URL?: string;
  }
}

function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    if (window.API_URL) return window.API_URL;
    if (window.SISTEMA_INVENTARIO_API_URL) return window.SISTEMA_INVENTARIO_API_URL;
    try {
      const stored = localStorage.getItem('sistema_inventario_api_url');
      if (stored) return stored;
    } catch {}
  }
  // En produccion el frontend y la API viven en el mismo dominio (Vercel),
  // por eso basta con una ruta relativa. Se puede sobreescribir con window.API_URL.
  return '/api';
}

export const environment = {
  production: true,
  apiUrl: getApiUrl(),
};
