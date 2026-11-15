import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, Categoria, ResultadoPaginado } from '../models';

export interface ListarCategoriasParams {
  buscar?: string;
  incluirInactivos?: boolean;
}

export interface CategoriaPayload {
  nombre: string;
  descripcion?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private apiUrl = `${environment.apiUrl}/categorias`;

  constructor(private http: HttpClient) {}

  listar(params: ListarCategoriasParams = {}): Observable<ApiResponse<ResultadoPaginado<Categoria>>> {
    let httpParams = new HttpParams();
    if (params.buscar) httpParams = httpParams.set('buscar', params.buscar);
    if (params.incluirInactivos) httpParams = httpParams.set('incluirInactivos', 'true');
    return this.http.get<ApiResponse<ResultadoPaginado<Categoria>>>(this.apiUrl, {
      params: httpParams,
    });
  }

  crear(payload: CategoriaPayload): Observable<ApiResponse<Categoria>> {
    return this.http.post<ApiResponse<Categoria>>(this.apiUrl, payload);
  }

  actualizar(id: string, payload: CategoriaPayload): Observable<ApiResponse<Categoria>> {
    return this.http.put<ApiResponse<Categoria>>(`${this.apiUrl}/${id}`, payload);
  }

  cambiarEstado(id: string, activo: boolean): Observable<ApiResponse<Categoria>> {
    return this.http.patch<ApiResponse<Categoria>>(`${this.apiUrl}/${id}/estado`, { activo });
  }

  eliminar(id: string): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(`${this.apiUrl}/${id}`);
  }
}
