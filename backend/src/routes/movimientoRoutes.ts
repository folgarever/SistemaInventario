import { Router } from 'express';
import { MovimientoController } from '../controllers/movimientoController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

// El historial de movimientos es de solo lectura y requiere autenticación.
router.use(authenticateToken);

router.get('/', MovimientoController.listar);

export default router;
