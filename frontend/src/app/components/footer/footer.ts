import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Pie de pagina con la informacion legal y el medio de contacto.
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="app-footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <span class="footer-mark brand-logo" aria-hidden="true"></span>
          <div>
            <span class="footer-name">Sistema de Inventario</span>
            <span class="footer-tag">Control de productos, existencias y movimientos</span>
          </div>
        </div>

        <div class="footer-links">
          <a class="footer-link" href="/manual/Manual-Usuario.pdf" download="Manual-Usuario.pdf">
            Manual de usuario (PDF)
          </a>
          <a routerLink="/aviso-privacidad" class="footer-link">Aviso de privacidad</a>
          <a class="footer-mail" href="mailto:folgarever19@gmail.com">folgarever19&#64;gmail.com</a>
        </div>
      </div>

      <p class="footer-copy">© {{ anio }} Sistema de Inventario. Todos los derechos reservados.</p>
    </footer>
  `,
  styles: [
    `
      .app-footer {
        margin-top: 40px;
        border-top: 1px solid var(--border);
        background-color: var(--surface);
        padding: 24px clamp(20px, 2.6vw, 64px) 28px;
      }
      .footer-inner {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 18px;
      }
      .footer-brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .footer-mark {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        border-radius: var(--radius-uber);
        background-color: var(--primary-bg);
        color: var(--primary-text);
        font-size: 11px;
        font-weight: 700;
        flex: none;
      }
      .footer-name {
        display: block;
        font-size: 14px;
        font-weight: 700;
        color: var(--text-primary);
        letter-spacing: -0.02em;
      }
      .footer-tag {
        display: block;
        font-size: 12px;
        color: var(--text-secondary);
      }
      .footer-mail {
        font-size: 13px;
        color: var(--text-secondary);
      }
      .footer-mail:hover {
        color: var(--text-primary);
        text-decoration: underline;
      }
      .footer-links {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
      }
      .footer-link {
        font-size: 13px;
        color: var(--text-secondary);
      }
      .footer-link:hover {
        color: var(--text-primary);
        text-decoration: underline;
      }
      .footer-link:focus-visible,
      .footer-mail:focus-visible {
        outline: none;
        box-shadow: var(--ring);
        border-radius: var(--radius-sm);
      }
      .footer-copy {
        margin-top: 18px;
        padding-top: 16px;
        border-top: 1px solid var(--border);
        font-size: 12px;
        color: var(--text-secondary);
      }
      @media (max-width: 640px) {
        .footer-inner {
          flex-direction: column;
        }
        .footer-links {
          align-items: flex-start;
        }
      }
    `,
  ],
})
export class FooterComponent {
  readonly anio = new Date().getFullYear();
}
