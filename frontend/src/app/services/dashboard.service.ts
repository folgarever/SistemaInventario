import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, ResumenDashboard } from '../models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private apiUrl = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  resumen(): Observable<ApiResponse<ResumenDashboard>> {
    return this.http.get<ApiResponse<ResumenDashboard>>(`${this.apiUrl}/resumen`);
  }
}
