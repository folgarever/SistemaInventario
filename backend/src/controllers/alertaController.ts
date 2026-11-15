import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboardService';

export class AlertaController {
  static async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const alertas = await DashboardService.alertas(req.user!.id);
      res.status(200).json({ success: true, data: alertas });
    } catch (err) {
      next(err);
    }
  }
}
