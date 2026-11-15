import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AlertasDashboard, ApiResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class AlertaService {
  private apiUrl = `${environment.apiUrl}/alertas`;

  constructor(private http: HttpClient) {}

  listar(): Observable<ApiResponse<AlertasDashboard>> {
    return this.http.get<ApiResponse<AlertasDashboard>>(this.apiUrl);
  }
}
