import { Request, Response, NextFunction } from 'express';
import { ProductoService } from '../services/productoService';
import { parsePaginacion } from '../utils/pagination';

function parseBooleano(valor: unknown): boolean {
  return valor === true || valor === 'true' || valor === '1' || valor === 1;
}

export class ProductoController {
  static async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await ProductoService.listar(req.user!.id, {
        buscar: req.query.buscar as string | undefined,
        categoriaId: req.query.categoriaId as string | undefined,
        proveedorId: req.query.proveedorId as string | undefined,
        incluirInactivos: parseBooleano(req.query.incluirInactivos),
        soloBajoStock: parseBooleano(req.query.soloBajoStock),
        paginacion: parsePaginacion(req),
      });
      res.status(200).json({ success: true, data: resultado });
    } catch (err) {
      next(err);
    }
  }

  static async obtener(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const producto = await ProductoService.obtener(req.user!.id, req.params.id);
      res.status(200).json({ success: true, data: producto });
    } catch (err) {
      next(err);
    }
  }

  static async crear(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const producto = await ProductoService.crear(req.user!.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Producto creado exitosamente',
        data: producto,
      });
    } catch (err) {
      next(err);
    }
  }

  static async actualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const producto = await ProductoService.actualizar(req.user!.id, req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Producto actualizado exitosamente',
        data: producto,
      });
    } catch (err) {
      next(err);
    }
  }

  static async cambiarEstado(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const activo = parseBooleano(req.body?.activo);
      const producto = await ProductoService.cambiarEstado(req.user!.id, req.params.id, activo);
      res.status(200).json({
        success: true,
        message: activo ? 'Producto activado' : 'Producto desactivado',
        data: producto,
      });
    } catch (err) {
      next(err);
    }
  }

  static async eliminar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await ProductoService.eliminar(req.user!.id, req.params.id);
      res.status(200).json({ success: true, message: 'Producto eliminado exitosamente' });
    } catch (err) {
      next(err);
    }
  }
}
