import { Router } from 'express';
import { ReporteController } from '../controllers/reporteController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

// Los reportes requieren autenticación.
router.use(authenticateToken);

router.get('/inventario', ReporteController.inventario);
router.get('/movimientos', ReporteController.movimientos);
router.get('/ventas', ReporteController.ventas);
router.get('/mermas', ReporteController.mermas);
router.get('/rotacion', ReporteController.rotacion);

export default router;
