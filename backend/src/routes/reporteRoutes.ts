import { Router } from 'express';
import { ReporteController } from '../controllers/reporteController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

// Los reportes requieren autenticación.
router.use(authenticateToken);

router.get('/inventario', ReporteController.inventario);
router.get('/movimientos', ReporteController.movimientos);

export default router;
