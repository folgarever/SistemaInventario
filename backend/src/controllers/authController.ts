import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';

export class AuthController {
  static async registrar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { nombres, apellidos, email, username, password } = req.body;
      const resultado = await AuthService.registrar({
        nombres,
        apellidos,
        email,
        username,
        password,
      });

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: resultado,
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { usernameOrEmail, password } = req.body;
      const resultado = await AuthService.login({ usernameOrEmail, password });

      res.status(200).json({
        success: true,
        message: 'Inicio de sesión exitoso',
        data: resultado,
      });
    } catch (err) {
      next(err);
    }
  }

  static async perfil(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ success: false, message: 'Usuario no autenticado' });
        return;
      }

      const usuario = await AuthService.obtenerPerfil(req.user.id);

      res.status(200).json({ success: true, data: usuario });
    } catch (err) {
      next(err);
    }
  }

  static async actualizarPerfil(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { nombres, apellidos } = req.body;
      const usuario = await AuthService.actualizarPerfil(req.user!.id, { nombres, apellidos });

      res.status(200).json({
        success: true,
        message: 'Perfil actualizado exitosamente',
        data: usuario,
      });
    } catch (err) {
      next(err);
    }
  }

  static async cambiarPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { passwordActual, passwordNueva } = req.body;
      await AuthService.cambiarPassword(req.user!.id, { passwordActual, passwordNueva });

      res.status(200).json({
        success: true,
        message: 'Contraseña actualizada exitosamente',
      });
    } catch (err) {
      next(err);
    }
  }

  static async solicitarRestablecimiento(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email } = req.body;
      await AuthService.solicitarRestablecimiento(email);

      res.status(200).json({
        success: true,
        message:
          'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
      });
    } catch (err) {
      next(err);
    }
  }

  static async restablecerPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, passwordNueva } = req.body;
      await AuthService.restablecerPassword({ token, passwordNueva });

      res.status(200).json({
        success: true,
        message: 'Contraseña restablecida exitosamente. Ya puedes iniciar sesión.',
      });
    } catch (err) {
      next(err);
    }
  }

  static async solicitarVerificacionEmail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const resultado = await AuthService.solicitarVerificacionEmail(req.user!.id);

      if (resultado.yaVerificado) {
        res.status(200).json({
          success: true,
          message: 'Tu correo ya estaba verificado.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: resultado.enviado
          ? 'Te enviamos un enlace para verificar tu correo.'
          : 'No se pudo enviar el correo en este momento. Intenta más tarde.',
        data: { enviado: resultado.enviado },
      });
    } catch (err) {
      next(err);
    }
  }

  static async verificarEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body;
      await AuthService.verificarEmail(token);

      res.status(200).json({
        success: true,
        message: 'Correo verificado exitosamente.',
      });
    } catch (err) {
      next(err);
    }
  }

  static async eliminarCuenta(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { password } = req.body;
      await AuthService.eliminarCuenta(req.user!.id, password);

      res.status(200).json({
        success: true,
        message: 'Cuenta eliminada exitosamente.',
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      message: 'Sesión cerrada exitosamente',
    });
  }
}
