import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

// El resumen del panel requiere autenticación.
router.use(authenticateToken);

router.get('/resumen', DashboardController.resumen);

export default router;
