import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Ajuste, ApiResponse, ResultadoAjuste, ResultadoPaginado } from '../models';

export interface AjustePayload {
  producto_id: string;
  existencias_fisicas: number | string;
  motivo: string;
  observaciones?: string | null;
  client_request_id?: string | null;
  fecha?: string | null;
}

export interface ListarAjustesParams {
  productoId?: string;
  motivo?: string;
  desde?: string;
  hasta?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class AjusteService {
  private apiUrl = `${environment.apiUrl}/ajustes`;

  constructor(private http: HttpClient) {}

  listar(params: ListarAjustesParams = {}): Observable<ApiResponse<ResultadoPaginado<Ajuste>>> {
    let httpParams = new HttpParams();
    if (params.productoId) httpParams = httpParams.set('productoId', params.productoId);
    if (params.motivo) httpParams = httpParams.set('motivo', params.motivo);
    if (params.desde) httpParams = httpParams.set('desde', params.desde);
    if (params.hasta) httpParams = httpParams.set('hasta', params.hasta);
    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.limit) httpParams = httpParams.set('limit', String(params.limit));
    return this.http.get<ApiResponse<ResultadoPaginado<Ajuste>>>(this.apiUrl, {
      params: httpParams,
    });
  }

  registrar(payload: AjustePayload): Observable<ApiResponse<ResultadoAjuste>> {
    return this.http.post<ApiResponse<ResultadoAjuste>>(this.apiUrl, payload);
  }
}
