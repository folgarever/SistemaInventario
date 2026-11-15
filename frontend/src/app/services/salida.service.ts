import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, ResultadoPaginado, ResultadoSalida, Salida } from '../models';

export interface SalidaPayload {
  producto_id: string;
  cantidad: number | string;
  motivo: string;
  observaciones?: string | null;
  client_request_id?: string | null;
  fecha?: string | null;
}

export interface ListarSalidasParams {
  productoId?: string;
  motivo?: string;
  desde?: string;
  hasta?: string;
}

@Injectable({ providedIn: 'root' })
export class SalidaService {
  private apiUrl = `${environment.apiUrl}/salidas`;

  constructor(private http: HttpClient) {}

  listar(params: ListarSalidasParams = {}): Observable<ApiResponse<ResultadoPaginado<Salida>>> {
    let httpParams = new HttpParams();
    if (params.productoId) httpParams = httpParams.set('productoId', params.productoId);
    if (params.motivo) httpParams = httpParams.set('motivo', params.motivo);
    if (params.desde) httpParams = httpParams.set('desde', params.desde);
    if (params.hasta) httpParams = httpParams.set('hasta', params.hasta);
    return this.http.get<ApiResponse<ResultadoPaginado<Salida>>>(this.apiUrl, {
      params: httpParams,
    });
  }

  registrar(payload: SalidaPayload): Observable<ApiResponse<ResultadoSalida>> {
    return this.http.post<ApiResponse<ResultadoSalida>>(this.apiUrl, payload);
  }
}
