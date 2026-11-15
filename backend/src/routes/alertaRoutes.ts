import { Router } from 'express';
import { AlertaController } from '../controllers/alertaController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

// Las alertas de stock requieren autenticación.
router.use(authenticateToken);

router.get('/', AlertaController.listar);

export default router;
