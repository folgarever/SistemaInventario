import { Request, Response, NextFunction } from 'express';
import { AjusteService } from '../services/ajusteService';
import { parsePaginacion } from '../utils/pagination';

export class AjusteController {
  static async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await AjusteService.listar(req.user!.id, {
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
      const ajuste = await AjusteService.obtener(req.user!.id, req.params.id);
      res.status(200).json({ success: true, data: ajuste });
    } catch (err) {
      next(err);
    }
  }

  static async registrar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await AjusteService.registrar(req.user!.id, req.body);
      res.status(resultado.idempotente ? 200 : 201).json({
        success: true,
        message: resultado.idempotente
          ? 'El ajuste ya había sido registrado'
          : 'Ajuste registrado exitosamente',
        data: resultado,
      });
    } catch (err) {
      next(err);
    }
  }
}
