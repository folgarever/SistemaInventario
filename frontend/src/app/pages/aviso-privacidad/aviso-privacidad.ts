import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Aviso de privacidad. Describe, de forma breve y veraz, el tratamiento real de
// los datos personales que la aplicacion realiza hoy: que se recopila, para que,
// donde se guarda y que servicios de terceros intervienen.
@Component({
  selector: 'app-aviso-privacidad',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Aviso de privacidad</h1>
          <p class="page-subtitle">Última actualización: noviembre de 2026.</p>
        </div>
      </div>

      <div class="card legal">
        <p>
          Este aviso explica qué datos personales trata <strong>Sistema de Inventario</strong>, con
          qué finalidad, dónde se almacenan y con qué servicios de terceros se comparten. Está
          redactado para reflejar el funcionamiento real de la aplicación.
        </p>

        <h2 class="section-title">1. Responsable del proyecto</h2>
        <p>
          Sistema de Inventario es un proyecto personal desarrollado por FolgarEver con fines de
          aprendizaje y uso propio. Para cualquier consulta relacionada con este aviso o con tus
          datos puedes escribir a
          <a href="mailto:folgarever19@gmail.com">folgarever19&#64;gmail.com</a>.
        </p>

        <h2 class="section-title">2. Qué datos se recopilan</h2>
        <ul>
          <li>
            <strong>Datos de la cuenta:</strong> nombres, apellidos, correo electrónico, nombre de
            usuario y contraseña. La contraseña no se guarda en texto legible: se almacena como un
            hash (bcrypt) que no permite recuperarla.
          </li>
          <li>
            <strong>Datos de inventario:</strong> los productos, categorías, proveedores y
            movimientos que registres, asociados únicamente a tu cuenta.
          </li>
        </ul>

        <h2 class="section-title">3. Para qué se usan</h2>
        <p>
          Únicamente para crear y administrar tu cuenta y para que la aplicación funcione. No se
          usan para publicidad, no se elaboran perfiles y no se venden ni ceden a terceros con fines
          comerciales.
        </p>

        <h2 class="section-title">4. Dónde se almacenan y qué terceros intervienen</h2>
        <p>
          Los datos se almacenan en una base de datos PostgreSQL alojada en Supabase. Para que la
          aplicación funcione intervienen estos proveedores, que pueden tratar datos por cuenta del
          responsable:
        </p>
        <ul>
          <li><strong>Supabase</strong> — base de datos donde se guarda la información.</li>
          <li><strong>Vercel</strong> — alojamiento del sitio web y de la API.</li>
          <li>
            <strong>Resend</strong> — envío del correo de restablecimiento de contraseña, solo si se
            utiliza esa función.
          </li>
          <li>
            <strong>Google Fonts</strong> — carga de la tipografía; al descargarla, Google puede
            registrar la dirección IP de tu navegador.
          </li>
        </ul>
        <p>
          Algunos de estos proveedores pueden estar ubicados fuera de Guatemala, por lo que tus
          datos podrían transferirse y procesarse en otros países.
        </p>

        <h2 class="section-title">5. Cuánto tiempo se conservan</h2>
        <p>
          Mientras tu cuenta permanezca activa. Si solicitas la eliminación de la cuenta, los datos
          asociados se eliminan.
        </p>

        <h2 class="section-title">6. Tus derechos</h2>
        <p>
          Puedes solicitar el acceso, la corrección o la eliminación de tus datos escribiendo a
          <a href="mailto:folgarever19@gmail.com">folgarever19&#64;gmail.com</a>. Las solicitudes se
          atienden de forma manual.
        </p>

        <h2 class="section-title">7. Cookies y almacenamiento local</h2>
        <p>
          La aplicación <strong>no utiliza cookies</strong>. Solo guarda en el almacenamiento local
          de tu navegador (localStorage) un token de sesión y los datos básicos de tu perfil, con la
          única finalidad de mantener la sesión iniciada. Al cerrar sesión, esa información se
          elimina del navegador.
        </p>

        <h2 class="section-title">8. Menores de edad</h2>
        <p>
          La aplicación no está dirigida a menores de edad y no se recopilan datos de menores de
          forma consciente.
        </p>

        <h2 class="section-title">9. Cambios en este aviso</h2>
        <p>
          Este aviso puede actualizarse si cambian las funcionalidades o los servicios utilizados.
          La fecha de la última actualización se indica al inicio de la página.
        </p>

        <div class="legal-acciones">
          <a routerLink="/" class="btn-uber">Volver al inicio</a>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .legal {
        max-width: 820px;
      }
      .legal p {
        margin-bottom: 14px;
        color: var(--color-gray-dark);
      }
      .legal .section-title {
        margin: 26px 0 10px;
      }
      .legal .section-title:first-of-type {
        margin-top: 8px;
      }
      .legal ul {
        margin: 0 0 14px 20px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .legal li {
        color: var(--color-gray-dark);
      }
      .legal a {
        color: var(--color-black);
        text-decoration: underline;
      }
      .legal-acciones {
        margin-top: 28px;
      }
    `,
  ],
})
export class AvisoPrivacidadComponent {}
