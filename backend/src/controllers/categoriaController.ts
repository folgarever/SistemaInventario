import { Request, Response, NextFunction } from 'express';
import { CategoriaService } from '../services/categoriaService';
import { parsePaginacion } from '../utils/pagination';

function parseBooleano(valor: unknown): boolean {
  return valor === true || valor === 'true' || valor === '1' || valor === 1;
}

export class CategoriaController {
  static async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await CategoriaService.listar(req.user!.id, {
        buscar: req.query.buscar as string | undefined,
        incluirInactivos: parseBooleano(req.query.incluirInactivos),
        paginacion: parsePaginacion(req),
      });
      res.status(200).json({ success: true, data: resultado });
    } catch (err) {
      next(err);
    }
  }

  static async obtener(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoria = await CategoriaService.obtener(req.user!.id, req.params.id);
      res.status(200).json({ success: true, data: categoria });
    } catch (err) {
      next(err);
    }
  }

  static async crear(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoria = await CategoriaService.crear(req.user!.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Categoría creada exitosamente',
        data: categoria,
      });
    } catch (err) {
      next(err);
    }
  }

  static async actualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categoria = await CategoriaService.actualizar(req.user!.id, req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Categoría actualizada exitosamente',
        data: categoria,
      });
    } catch (err) {
      next(err);
    }
  }

  static async cambiarEstado(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const activo = parseBooleano(req.body?.activo);
      const categoria = await CategoriaService.cambiarEstado(req.user!.id, req.params.id, activo);
      res.status(200).json({
        success: true,
        message: activo ? 'Categoría activada' : 'Categoría desactivada',
        data: categoria,
      });
    } catch (err) {
      next(err);
    }
  }

  static async eliminar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await CategoriaService.eliminar(req.user!.id, req.params.id);
      res.status(200).json({ success: true, message: 'Categoría eliminada exitosamente' });
    } catch (err) {
      next(err);
    }
  }
}
