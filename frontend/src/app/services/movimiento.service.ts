import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, Movimiento, ResultadoPaginado } from '../models';

export interface ListarMovimientosParams {
  productoId?: string;
  tipo?: string;
  desde?: string;
  hasta?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class MovimientoService {
  private apiUrl = `${environment.apiUrl}/movimientos`;

  constructor(private http: HttpClient) {}

  listar(
    params: ListarMovimientosParams = {},
  ): Observable<ApiResponse<ResultadoPaginado<Movimiento>>> {
    let httpParams = new HttpParams();
    if (params.productoId) httpParams = httpParams.set('productoId', params.productoId);
    if (params.tipo) httpParams = httpParams.set('tipo', params.tipo);
    if (params.desde) httpParams = httpParams.set('desde', params.desde);
    if (params.hasta) httpParams = httpParams.set('hasta', params.hasta);
    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.limit) httpParams = httpParams.set('limit', String(params.limit));
    return this.http.get<ApiResponse<ResultadoPaginado<Movimiento>>>(this.apiUrl, {
      params: httpParams,
    });
  }
}
