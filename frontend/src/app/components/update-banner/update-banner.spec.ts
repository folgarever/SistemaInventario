import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { UpdateBannerComponent } from './update-banner';

function crearMockSw(habilitado: boolean) {
  const eventos = new Subject<VersionEvent>();
  const mock = {
    isEnabled: habilitado,
    versionUpdates: eventos.asObservable(),
    activateUpdate: () => Promise.resolve(),
    emitir: (evento: VersionEvent) => eventos.next(evento),
  };
  return mock;
}

describe('UpdateBannerComponent', () => {
  it('no muestra el aviso cuando el service worker esta deshabilitado', () => {
    TestBed.configureTestingModule({
      imports: [UpdateBannerComponent],
      providers: [{ provide: SwUpdate, useValue: crearMockSw(false) }],
    });
    const fixture = TestBed.createComponent(UpdateBannerComponent);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.update-banner')).toBeNull();
  });

  it('muestra el aviso cuando hay una version nueva lista', () => {
    const mock = crearMockSw(true);
    TestBed.configureTestingModule({
      imports: [UpdateBannerComponent],
      providers: [{ provide: SwUpdate, useValue: mock }],
    });
    const fixture = TestBed.createComponent(UpdateBannerComponent);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.update-banner')).toBeNull();

    mock.emitir({
      type: 'VERSION_READY',
      currentVersion: { hash: 'a' },
      latestVersion: { hash: 'b' },
    } as VersionEvent);
    fixture.detectChanges();

    const banner = (fixture.nativeElement as HTMLElement).querySelector('.update-banner');
    expect(banner).toBeTruthy();
    expect(banner?.textContent).toContain('versión nueva');
  });
});
