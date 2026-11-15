import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, Entrada, ResultadoEntrada, ResultadoPaginado } from '../models';

export interface EntradaItemPayload {
  producto_id: string;
  cantidad: number | string;
  costo_unitario: number | string;
}

export interface EntradaPayload {
  proveedor_id?: string | null;
  observaciones?: string | null;
  client_request_id?: string | null;
  fecha?: string | null;
  items: EntradaItemPayload[];
}

export interface ListarEntradasParams {
  proveedorId?: string;
  desde?: string;
  hasta?: string;
}

@Injectable({ providedIn: 'root' })
export class EntradaService {
  private apiUrl = `${environment.apiUrl}/entradas`;

  constructor(private http: HttpClient) {}

  listar(params: ListarEntradasParams = {}): Observable<ApiResponse<ResultadoPaginado<Entrada>>> {
    let httpParams = new HttpParams();
    if (params.proveedorId) httpParams = httpParams.set('proveedorId', params.proveedorId);
    if (params.desde) httpParams = httpParams.set('desde', params.desde);
    if (params.hasta) httpParams = httpParams.set('hasta', params.hasta);
    return this.http.get<ApiResponse<ResultadoPaginado<Entrada>>>(this.apiUrl, {
      params: httpParams,
    });
  }

  obtener(id: string): Observable<ApiResponse<Entrada>> {
    return this.http.get<ApiResponse<Entrada>>(`${this.apiUrl}/${id}`);
  }

  registrar(payload: EntradaPayload): Observable<ApiResponse<ResultadoEntrada>> {
    return this.http.post<ApiResponse<ResultadoEntrada>>(this.apiUrl, payload);
  }
}
