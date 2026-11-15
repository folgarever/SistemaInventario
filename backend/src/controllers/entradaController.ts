import { Request, Response, NextFunction } from 'express';
import { EntradaService } from '../services/entradaService';
import { parsePaginacion } from '../utils/pagination';

export class EntradaController {
  static async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await EntradaService.listar(req.user!.id, {
        proveedorId: req.query.proveedorId as string | undefined,
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
      const entrada = await EntradaService.obtener(req.user!.id, req.params.id);
      res.status(200).json({ success: true, data: entrada });
    } catch (err) {
      next(err);
    }
  }

  static async registrar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await EntradaService.registrar(req.user!.id, req.body);
      res.status(resultado.idempotente ? 200 : 201).json({
        success: true,
        message: resultado.idempotente
          ? 'La entrada ya había sido registrada'
          : 'Entrada registrada exitosamente',
        data: resultado,
      });
    } catch (err) {
      next(err);
    }
  }
}
