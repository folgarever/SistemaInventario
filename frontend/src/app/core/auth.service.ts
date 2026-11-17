import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, AuthResponse, Usuario } from '../models';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  // El token solo se usa para mantener la sesión en el navegador; los datos
  // importantes viven siempre en la base de datos remota.
  private tokenKey = 'sistema_inventario_token';
  private userKey = 'sistema_inventario_user';

  currentUser = signal<Usuario | null>(this.getStoredUser());
  isAuthenticated = signal<boolean>(!!this.getStoredToken());

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  private getStoredToken(): string | null {
    try {
      return localStorage.getItem(this.tokenKey);
    } catch {
      return null;
    }
  }

  private getStoredUser(): Usuario | null {
    try {
      const u = localStorage.getItem(this.userKey);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return this.getStoredToken();
  }

  register(data: {
    nombres: string;
    apellidos: string;
    email: string;
    username: string;
    password: string;
  }): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/register`, data).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.setSession(res.data.token, res.data.usuario);
        }
      }),
    );
  }

  login(credentials: {
    usernameOrEmail: string;
    password: string;
  }): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/login`, credentials).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.setSession(res.data.token, res.data.usuario);
        }
      }),
    );
  }

  solicitarRestablecimiento(email: string): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(`${this.apiUrl}/forgot-password`, {
      email,
    });
  }

  restablecerPassword(
    token: string,
    passwordNueva: string,
  ): Observable<{ success: boolean; message?: string }> {
    return this.http.post<{ success: boolean; message?: string }>(`${this.apiUrl}/reset-password`, {
      token,
      passwordNueva,
    });
  }

  obtenerPerfil(): Observable<ApiResponse<Usuario>> {
    return this.http.get<ApiResponse<Usuario>>(`${this.apiUrl}/profile`);
  }

  actualizarPerfil(data: {
    nombres: string;
    apellidos: string;
  }): Observable<ApiResponse<Usuario>> {
    return this.http.put<ApiResponse<Usuario>>(`${this.apiUrl}/profile`, data).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.updateStoredUser(res.data);
        }
      }),
    );
  }

  cambiarPassword(data: {
    passwordActual: string;
    passwordNueva: string;
  }): Observable<{ success: boolean; message?: string }> {
    return this.http.put<{ success: boolean; message?: string }>(`${this.apiUrl}/password`, data);
  }

  eliminarCuenta(password: string): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(`${this.apiUrl}/account`, {
      body: { password },
    });
  }

  // Refresca los datos del usuario en memoria y en localStorage.
  refrescarPerfil(): Observable<ApiResponse<Usuario>> {
    return this.obtenerPerfil().pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.updateStoredUser(res.data);
        }
      }),
    );
  }

  private setSession(token: string, usuario: Usuario): void {
    try {
      localStorage.setItem(this.tokenKey, token);
      localStorage.setItem(this.userKey, JSON.stringify(usuario));
    } catch (e) {
      console.error('Error al guardar la sesión:', e);
    }
    this.currentUser.set(usuario);
    this.isAuthenticated.set(true);
  }

  private updateStoredUser(usuario: Usuario): void {
    try {
      localStorage.setItem(this.userKey, JSON.stringify(usuario));
    } catch (e) {
      console.error('Error al actualizar el usuario:', e);
    }
    this.currentUser.set(usuario);
  }

  logout(): void {
    try {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    } catch (e) {
      console.error('Error al limpiar la sesión:', e);
    }
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }
}
