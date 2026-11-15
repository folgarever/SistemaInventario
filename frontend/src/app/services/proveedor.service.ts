import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, Proveedor, ResultadoPaginado } from '../models';

export interface ListarProveedoresParams {
  buscar?: string;
  incluirInactivos?: boolean;
}

export interface ProveedorPayload {
  nombre: string;
  contacto?: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  nit?: string | null;
  observaciones?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProveedorService {
  private apiUrl = `${environment.apiUrl}/proveedores`;

  constructor(private http: HttpClient) {}

  listar(params: ListarProveedoresParams = {}): Observable<ApiResponse<ResultadoPaginado<Proveedor>>> {
    let httpParams = new HttpParams();
    if (params.buscar) httpParams = httpParams.set('buscar', params.buscar);
    if (params.incluirInactivos) httpParams = httpParams.set('incluirInactivos', 'true');
    return this.http.get<ApiResponse<ResultadoPaginado<Proveedor>>>(this.apiUrl, {
      params: httpParams,
    });
  }

  crear(payload: ProveedorPayload): Observable<ApiResponse<Proveedor>> {
    return this.http.post<ApiResponse<Proveedor>>(this.apiUrl, payload);
  }

  actualizar(id: string, payload: ProveedorPayload): Observable<ApiResponse<Proveedor>> {
    return this.http.put<ApiResponse<Proveedor>>(`${this.apiUrl}/${id}`, payload);
  }

  cambiarEstado(id: string, activo: boolean): Observable<ApiResponse<Proveedor>> {
    return this.http.patch<ApiResponse<Proveedor>>(`${this.apiUrl}/${id}/estado`, { activo });
  }

  eliminar(id: string): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(`${this.apiUrl}/${id}`);
  }
}
