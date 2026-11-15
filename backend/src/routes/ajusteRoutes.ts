import { Router } from 'express';
import { AjusteController } from '../controllers/ajusteController';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = Router();

// Todas las rutas de ajustes requieren autenticación.
router.use(authenticateToken);

router.get('/', AjusteController.listar);
router.post('/', AjusteController.registrar);
router.get('/:id', AjusteController.obtener);

export default router;
