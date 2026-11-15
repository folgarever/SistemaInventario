import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, ReporteInventario, ReporteMovimientos } from '../models';

export interface FiltrosReporteInventario {
  categoriaId?: string;
  proveedorId?: string;
  soloBajoStock?: boolean;
  incluirInactivos?: boolean;
}

export interface FiltrosReporteMovimientos {
  desde?: string;
  hasta?: string;
  tipo?: string;
  productoId?: string;
}

@Injectable({ providedIn: 'root' })
export class ReporteService {
  private apiUrl = `${environment.apiUrl}/reportes`;

  constructor(private http: HttpClient) {}

  inventario(
    filtros: FiltrosReporteInventario = {},
  ): Observable<ApiResponse<ReporteInventario>> {
    let params = new HttpParams();
    if (filtros.categoriaId) params = params.set('categoriaId', filtros.categoriaId);
    if (filtros.proveedorId) params = params.set('proveedorId', filtros.proveedorId);
    if (filtros.soloBajoStock) params = params.set('soloBajoStock', 'true');
    if (filtros.incluirInactivos) params = params.set('incluirInactivos', 'true');
    return this.http.get<ApiResponse<ReporteInventario>>(`${this.apiUrl}/inventario`, { params });
  }

  movimientos(
    filtros: FiltrosReporteMovimientos = {},
  ): Observable<ApiResponse<ReporteMovimientos>> {
    let params = new HttpParams();
    if (filtros.desde) params = params.set('desde', filtros.desde);
    if (filtros.hasta) params = params.set('hasta', filtros.hasta);
    if (filtros.tipo) params = params.set('tipo', filtros.tipo);
    if (filtros.productoId) params = params.set('productoId', filtros.productoId);
    return this.http.get<ApiResponse<ReporteMovimientos>>(`${this.apiUrl}/movimientos`, { params });
  }
}
