import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AlertasDashboard, ApiResponse } from '../models';

// Mantiene el conteo de alertas de stock bajo para mostrarlo en la barra de
// navegacion. Se alimenta del endpoint /alertas y tambien puede sincronizarse
// con el resumen del Panel para no repetir la consulta.
@Injectable({ providedIn: 'root' })
export class AlertaService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/alertas`;

  readonly total = signal(0);
  readonly agotados = signal(0);

  sincronizar(alertas: AlertasDashboard): void {
    this.total.set(alertas.total);
    this.agotados.set(alertas.agotados);
  }

  cargar(): void {
    this.http.get<ApiResponse<AlertasDashboard>>(this.apiUrl).subscribe({
      next: (res) => this.sincronizar(res.data),
      // El indicador es informativo: si falla, se conserva el ultimo valor.
      error: () => undefined,
    });
  }

  limpiar(): void {
    this.total.set(0);
    this.agotados.set(0);
  }
}
