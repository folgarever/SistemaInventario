import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboardService';

export class DashboardController {
  static async resumen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resumen = await DashboardService.resumen(req.user!.id);
      res.status(200).json({ success: true, data: resumen });
    } catch (err) {
      next(err);
    }
  }
}
