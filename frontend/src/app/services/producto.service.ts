import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, Producto, ResultadoPaginado } from '../models';

export interface ListarProductosParams {
  buscar?: string;
  categoriaId?: string;
  proveedorId?: string;
  incluirInactivos?: boolean;
  soloBajoStock?: boolean;
}

export interface ProductoPayload {
  nombre: string;
  sku: string;
  categoria_id?: string | null;
  proveedor_id?: string | null;
  descripcion?: string | null;
  precio_compra?: number | string | null;
  precio_venta?: number | string | null;
  stock_minimo?: number | string | null;
  unidad_medida?: string | null;
  imagen_url?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private apiUrl = `${environment.apiUrl}/productos`;

  constructor(private http: HttpClient) {}

  listar(params: ListarProductosParams = {}): Observable<ApiResponse<ResultadoPaginado<Producto>>> {
    let httpParams = new HttpParams();
    if (params.buscar) httpParams = httpParams.set('buscar', params.buscar);
    if (params.categoriaId) httpParams = httpParams.set('categoriaId', params.categoriaId);
    if (params.proveedorId) httpParams = httpParams.set('proveedorId', params.proveedorId);
    if (params.incluirInactivos) httpParams = httpParams.set('incluirInactivos', 'true');
    if (params.soloBajoStock) httpParams = httpParams.set('soloBajoStock', 'true');
    return this.http.get<ApiResponse<ResultadoPaginado<Producto>>>(this.apiUrl, {
      params: httpParams,
    });
  }

  obtener(id: string): Observable<ApiResponse<Producto>> {
    return this.http.get<ApiResponse<Producto>>(`${this.apiUrl}/${id}`);
  }

  crear(payload: ProductoPayload): Observable<ApiResponse<Producto>> {
    return this.http.post<ApiResponse<Producto>>(this.apiUrl, payload);
  }

  actualizar(id: string, payload: ProductoPayload): Observable<ApiResponse<Producto>> {
    return this.http.put<ApiResponse<Producto>>(`${this.apiUrl}/${id}`, payload);
  }

  cambiarEstado(id: string, activo: boolean): Observable<ApiResponse<Producto>> {
    return this.http.patch<ApiResponse<Producto>>(`${this.apiUrl}/${id}/estado`, { activo });
  }

  eliminar(id: string): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(`${this.apiUrl}/${id}`);
  }
}
