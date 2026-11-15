import { Request, Response, NextFunction } from 'express';
import { MovimientoService } from '../services/movimientoService';
import { parsePaginacion } from '../utils/pagination';

export class MovimientoController {
  static async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await MovimientoService.listar(req.user!.id, {
        productoId: req.query.productoId as string | undefined,
        tipo: MovimientoService.validarTipo(req.query.tipo as string | undefined),
        desde: req.query.desde as string | undefined,
        hasta: req.query.hasta as string | undefined,
        paginacion: parsePaginacion(req),
      });
      res.status(200).json({ success: true, data: resultado });
    } catch (err) {
      next(err);
    }
  }
}
