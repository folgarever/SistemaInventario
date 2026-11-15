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
  return 'https://sistema-inventario.vercel.app/api';
}

export const environment = {
  production: true,
  apiUrl: getApiUrl(),
};
