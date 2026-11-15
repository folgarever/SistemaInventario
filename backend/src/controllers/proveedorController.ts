import { Request, Response, NextFunction } from 'express';
import { ProveedorService } from '../services/proveedorService';
import { parsePaginacion } from '../utils/pagination';

function parseBooleano(valor: unknown): boolean {
  return valor === true || valor === 'true' || valor === '1' || valor === 1;
}

export class ProveedorController {
  static async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resultado = await ProveedorService.listar(req.user!.id, {
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
      const proveedor = await ProveedorService.obtener(req.user!.id, req.params.id);
      res.status(200).json({ success: true, data: proveedor });
    } catch (err) {
      next(err);
    }
  }

  static async crear(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const proveedor = await ProveedorService.crear(req.user!.id, req.body);
      res.status(201).json({
        success: true,
        message: 'Proveedor creado exitosamente',
        data: proveedor,
      });
    } catch (err) {
      next(err);
    }
  }

  static async actualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const proveedor = await ProveedorService.actualizar(req.user!.id, req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Proveedor actualizado exitosamente',
        data: proveedor,
      });
    } catch (err) {
      next(err);
    }
  }

  static async cambiarEstado(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const activo = parseBooleano(req.body?.activo);
      const proveedor = await ProveedorService.cambiarEstado(req.user!.id, req.params.id, activo);
      res.status(200).json({
        success: true,
        message: activo ? 'Proveedor activado' : 'Proveedor desactivado',
        data: proveedor,
      });
    } catch (err) {
      next(err);
    }
  }

  static async eliminar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await ProveedorService.eliminar(req.user!.id, req.params.id);
      res.status(200).json({ success: true, message: 'Proveedor eliminado exitosamente' });
    } catch (err) {
      next(err);
    }
  }
}
