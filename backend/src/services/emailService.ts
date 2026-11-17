import { Resend } from 'resend';
import { env } from '../config/env';

let cliente: Resend | null = null;

function getCliente(): Resend | null {
  if (!env.RESEND_API_KEY) {
    return null;
  }
  if (!cliente) {
    cliente = new Resend(env.RESEND_API_KEY);
  }
  return cliente;
}

// Envia el correo con el enlace para restablecer la contraseña.
// Si el servicio de correo no esta configurado, no lanza error: devuelve false
// y deja constancia en el log, para no romper el flujo del usuario.
export async function enviarCorreoRestablecimiento(
  destinatario: string,
  nombre: string,
  enlace: string
): Promise<boolean> {
  const resend = getCliente();

  if (!resend) {
    console.warn(
      '[EMAIL] RESEND_API_KEY no esta configurada. No se envio el correo de restablecimiento.'
    );
    return false;
  }

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color:#000; max-width:520px;">
      <h2 style="margin:0 0 12px;">Restablecer contraseña</h2>
      <p style="color:#5E5E5E;">Hola ${nombre}, recibimos una solicitud para restablecer tu contraseña.</p>
      <p style="margin:24px 0;">
        <a href="${enlace}" style="background:#000;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
          Restablecer contraseña
        </a>
      </p>
      <p style="color:#5E5E5E;font-size:13px;">Si no solicitaste este cambio, puedes ignorar este correo. El enlace vence en 1 hora.</p>
      <p style="color:#AFAFAF;font-size:12px;">Sistema de Inventario</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: env.EMAIL_FROM,
      to: destinatario,
      subject: 'Restablecer contraseña — Sistema de Inventario',
      html,
    });
    return true;
  } catch (err) {
    console.error('[EMAIL] Error al enviar el correo de restablecimiento:', err);
    return false;
  }
}

// Envia el correo con el enlace para verificar la direccion de correo.
// Si el servicio de correo no esta configurado, no lanza error: devuelve false
// y deja constancia en el log, para no romper el flujo del usuario.
export async function enviarCorreoVerificacion(
  destinatario: string,
  nombre: string,
  enlace: string
): Promise<boolean> {
  const resend = getCliente();

  if (!resend) {
    console.warn(
      '[EMAIL] RESEND_API_KEY no esta configurada. No se envio el correo de verificación.'
    );
    return false;
  }

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color:#000; max-width:520px;">
      <h2 style="margin:0 0 12px;">Confirma tu correo</h2>
      <p style="color:#5E5E5E;">Hola ${nombre}, gracias por registrarte. Confirma tu dirección de correo para proteger tu cuenta.</p>
      <p style="margin:24px 0;">
        <a href="${enlace}" style="background:#000;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">
          Verificar correo
        </a>
      </p>
      <p style="color:#5E5E5E;font-size:13px;">Si no creaste esta cuenta, puedes ignorar este correo. El enlace vence en 24 horas.</p>
      <p style="color:#AFAFAF;font-size:12px;">Sistema de Inventario</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: env.EMAIL_FROM,
      to: destinatario,
      subject: 'Confirma tu correo — Sistema de Inventario',
      html,
    });
    return true;
  } catch (err) {
    console.error('[EMAIL] Error al enviar el correo de verificación:', err);
    return false;
  }
}
