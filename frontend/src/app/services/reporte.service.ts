import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ApiResponse,
  ReporteInventario,
  ReporteMovimientos,
  ReporteVentas,
} from '../models';

export interface FiltrosReporte {
  desde?: string;
  hasta?: string;
  categoriaId?: string;
  proveedorId?: string;
  productoId?: string;
  tipo?: string;
  soloBajoStock?: boolean;
  incluirInactivos?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private apiUrl = `${environment.apiUrl}/reportes`;

  constructor(private http: HttpClient) {}

  private params(filtros: FiltrosReporte): HttpParams {
    let httpParams = new HttpParams();
    if (filtros.desde) httpParams = httpParams.set('desde', filtros.desde);
    if (filtros.hasta) httpParams = httpParams.set('hasta', filtros.hasta);
    if (filtros.categoriaId) httpParams = httpParams.set('categoriaId', filtros.categoriaId);
    if (filtros.proveedorId) httpParams = httpParams.set('proveedorId', filtros.proveedorId);
    if (filtros.productoId) httpParams = httpParams.set('productoId', filtros.productoId);
    if (filtros.tipo) httpParams = httpParams.set('tipo', filtros.tipo);
    if (filtros.soloBajoStock) httpParams = httpParams.set('soloBajoStock', 'true');
    if (filtros.incluirInactivos) httpParams = httpParams.set('incluirInactivos', 'true');
    return httpParams;
  }

  inventario(filtros: FiltrosReporte = {}): Observable<ApiResponse<ReporteInventario>> {
    return this.http.get<ApiResponse<ReporteInventario>>(`${this.apiUrl}/inventario`, {
      params: this.params(filtros),
    });
  }

  movimientos(filtros: FiltrosReporte = {}): Observable<ApiResponse<ReporteMovimientos>> {
    return this.http.get<ApiResponse<ReporteMovimientos>>(`${this.apiUrl}/movimientos`, {
      params: this.params(filtros),
    });
  }

  ventas(filtros: FiltrosReporte = {}): Observable<ApiResponse<ReporteVentas>> {
    return this.http.get<ApiResponse<ReporteVentas>>(`${this.apiUrl}/ventas`, {
      params: this.params(filtros),
    });
  }
}
