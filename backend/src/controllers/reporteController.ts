import { Request, Response, NextFunction } from 'express';
import { ReporteService } from '../services/reporteService';
import { MovimientoService } from '../services/movimientoService';

function parseBooleano(valor: unknown): boolean {
  return valor === true || valor === 'true' || valor === '1' || valor === 1;
}

export class ReporteController {
  static async inventario(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reporte = await ReporteService.inventario(req.user!.id, {
        categoriaId: req.query.categoriaId as string | undefined,
        proveedorId: req.query.proveedorId as string | undefined,
        soloBajoStock: parseBooleano(req.query.soloBajoStock),
        incluirInactivos: parseBooleano(req.query.incluirInactivos),
      });
      res.status(200).json({ success: true, data: reporte });
    } catch (err) {
      next(err);
    }
  }

  static async movimientos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reporte = await ReporteService.movimientos(req.user!.id, {
        desde: req.query.desde as string | undefined,
        hasta: req.query.hasta as string | undefined,
        tipo: MovimientoService.validarTipo(req.query.tipo as string | undefined),
        productoId: req.query.productoId as string | undefined,
      });
      res.status(200).json({ success: true, data: reporte });
    } catch (err) {
      next(err);
    }
  }

  static async ventas(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reporte = await ReporteService.ventas(req.user!.id, {
        desde: req.query.desde as string | undefined,
        hasta: req.query.hasta as string | undefined,
        productoId: req.query.productoId as string | undefined,
      });
      res.status(200).json({ success: true, data: reporte });
    } catch (err) {
      next(err);
    }
  }

  static async mermas(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reporte = await ReporteService.mermas(req.user!.id, {
        desde: req.query.desde as string | undefined,
        hasta: req.query.hasta as string | undefined,
        productoId: req.query.productoId as string | undefined,
      });
      res.status(200).json({ success: true, data: reporte });
    } catch (err) {
      next(err);
    }
  }

  static async rotacion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reporte = await ReporteService.rotacion(req.user!.id, {
        desde: req.query.desde as string | undefined,
        hasta: req.query.hasta as string | undefined,
        soloSinMovimiento: parseBooleano(req.query.soloSinMovimiento),
      });
      res.status(200).json({ success: true, data: reporte });
    } catch (err) {
      next(err);
    }
  }
}
