import { Request, Response, NextFunction } from 'express';
import { SalidaService } from '../services/salidaService';
import { parsePaginacion } from '../utils/pagination';

export class SalidaController {
  static async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await SalidaService.listar(req.user!.id, {
        productoId: req.query.productoId as string | undefined,
        motivo: req.query.motivo as string | undefined,
        desde: req.query.desde as string | undefined,
        hasta: req.query.hasta as string | undefined,
        paginacion: parsePaginacion(req),
      });
      res.status(200).json({ success: true, data: resultado });
    } catch (err) {
      next(err);
    }
  }

  static async obtener(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const salida = await SalidaService.obtener(req.user!.id, req.params.id);
      res.status(200).json({ success: true, data: salida });
    } catch (err) {
      next(err);
    }
  }

  static async registrar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await SalidaService.registrar(req.user!.id, req.body);
      res.status(resultado.idempotente ? 200 : 201).json({
        success: true,
        message: resultado.idempotente
          ? 'La salida ya había sido registrada'
          : 'Salida registrada exitosamente',
        data: resultado,
      });
    } catch (err) {
      next(err);
    }
  }
}
