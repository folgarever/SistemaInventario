import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ToastComponent } from './toast';
import { ToastService } from '../../core/toast.service';

describe('ToastComponent', () => {
  it('renderiza las notificaciones con su estilo segun el tipo', () => {
    TestBed.configureTestingModule({ imports: [ToastComponent] });
    const fixture = TestBed.createComponent(ToastComponent);
    const servicio = TestBed.inject(ToastService);

    servicio.toasts.set([
      { id: 1, mensaje: 'Guardado', tipo: 'success' },
      { id: 2, mensaje: 'Error', tipo: 'error' },
    ]);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const toasts = el.querySelectorAll('.toast');
    expect(toasts.length).toBe(2);
    expect(el.textContent).toContain('Guardado');
    expect(el.querySelector('.toast-success')).toBeTruthy();
    expect(el.querySelector('.toast-error')).toBeTruthy();
  });

  it('no muestra nada cuando no hay notificaciones', () => {
    TestBed.configureTestingModule({ imports: [ToastComponent] });
    const fixture = TestBed.createComponent(ToastComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.toast').length).toBe(0);
  });
});
